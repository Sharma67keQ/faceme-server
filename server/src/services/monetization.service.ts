import { randomUUID } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import { PaymentProvider, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { emitRealtime, emitRealtimeToRoom, emitRealtimeToUser } from "../lib/realtime.js";
import { ApiError } from "../utils/api-error.js";

const giftCatalogSeed = [
  {
    slug: "spark",
    name: "Spark",
    description: "Quick applause for a live moment.",
    iconKey: "spark",
    coinCost: 25,
    accentColor: "#F4A261",
    sortOrder: 1,
  },
  {
    slug: "applause",
    name: "Applause",
    description: "Show visible support in the room.",
    iconKey: "applause",
    coinCost: 75,
    accentColor: "#2A9D8F",
    sortOrder: 2,
  },
  {
    slug: "crown",
    name: "Crown",
    description: "Back the host like a top supporter.",
    iconKey: "crown",
    coinCost: 250,
    accentColor: "#E9C46A",
    sortOrder: 3,
  },
  {
    slug: "spotlight",
    name: "Spotlight",
    description: "A premium gift for standout rooms.",
    iconKey: "spotlight",
    coinCost: 600,
    accentColor: "#E76F51",
    sortOrder: 4,
  },
] as const;

const defaultCommissionBps = 3000;

const roomGiftEventInclude = {
  sender: {
    select: {
      id: true,
      username: true,
      firstName: true,
      avatarUrl: true,
      premiumBadgeVisible: true,
      premiumUntil: true,
    },
  },
  receiver: {
    select: {
      id: true,
      username: true,
      firstName: true,
      avatarUrl: true,
      premiumBadgeVisible: true,
      premiumUntil: true,
    },
  },
  gift: {
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      iconKey: true,
      assetUrl: true,
      coinCost: true,
      accentColor: true,
    },
  },
} as const;

const isPremiumActive = (premiumUntil?: Date | null) => Boolean(premiumUntil && premiumUntil > new Date());

const mapUserPreview = (user: {
  id: string;
  username: string;
  firstName: string;
  avatarUrl: string | null;
  premiumBadgeVisible: boolean;
  premiumUntil: Date | null;
}) => ({
  id: user.id,
  username: user.username,
  firstName: user.firstName,
  avatarUrl: user.avatarUrl,
  isPremium: user.premiumBadgeVisible && isPremiumActive(user.premiumUntil),
});

const serializeGiftEvent = (event: any) => ({
  id: event.id,
  roomId: event.roomId,
  quantity: event.quantity,
  totalCoinCost: event.totalCoinCost,
  platformCommissionCoins: event.platformCommissionCoins,
  creatorNetCoins: event.creatorNetCoins,
  message: event.message,
  createdAt: event.createdAt,
  gift: event.gift,
  sender: mapUserPreview(event.sender),
  receiver: mapUserPreview(event.receiver),
});

const ensureWallet = async (userId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) =>
  tx.wallet.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
    },
  });

const ensureGiftCatalogSeeded = async () => {
  await Promise.all(
    giftCatalogSeed.map((gift) =>
      prisma.giftCatalogItem.upsert({
        where: { slug: gift.slug },
        update: {
          name: gift.name,
          description: gift.description,
          iconKey: gift.iconKey,
          coinCost: gift.coinCost,
          accentColor: gift.accentColor,
          isActive: true,
          sortOrder: gift.sortOrder,
        },
        create: gift,
      }),
    ),
  );
};

const getCommissionSplit = (totalCoinCost: number) => {
  const platformCommissionCoins = Math.ceil((totalCoinCost * defaultCommissionBps) / 10000);
  const creatorNetCoins = totalCoinCost - platformCommissionCoins;
  return {
    platformCommissionCoins,
    creatorNetCoins,
  };
};

const paymentProviders: Partial<Record<PaymentProvider, PaymentProviderHandler>> = {
  MANUAL_REVIEW: {
    async createIntent(input: { clientReference: string; coinsAmount: number; currency: string; fiatAmount?: number | null }) {
      return {
        status: "PENDING" as const,
        providerReference: `manual-${input.clientReference}`,
        verificationToken: randomUUID(),
        metadata: {
          workflow: "manual_review",
          coinsAmount: input.coinsAmount,
          currency: input.currency,
          fiatAmount: input.fiatAmount ?? null,
        },
      };
    },
    async verifyIntent() {
      return {
        status: "COMPLETED" as const,
      };
    },
  },
} as const;

export const monetizationService = {
  async getWalletSummary(userId: string) {
    const wallet = await ensureWallet(userId);
    const [transactions, subscription, plans] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.premiumSubscription.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          plan: true,
        },
        orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.premiumPlan.findMany({
        where: { isActive: true },
        orderBy: [{ interval: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    return {
      balanceCoins: wallet.balanceCoins,
      heldCoins: wallet.heldCoins,
      transactions,
      premium: subscription
        ? {
            status: subscription.status,
            expiresAt: subscription.expiresAt,
            badgeVisible: true,
            plan: subscription.plan,
          }
        : {
            status: "INACTIVE",
            expiresAt: null,
            badgeVisible: false,
            plan: null,
          },
      premiumPlans: plans,
    };
  },

  async listGiftCatalog() {
    await ensureGiftCatalogSeeded();
    return prisma.giftCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { coinCost: "asc" }],
    });
  },

  async createWalletTopUpIntent(
    userId: string,
    input: {
      provider?: PaymentProvider;
      coinsAmount: number;
      currency?: string;
      fiatAmount?: number | null;
    },
  ) {
    const provider = input.provider ?? "MANUAL_REVIEW";
    const providerHandler = paymentProviders[provider];

    if (!providerHandler) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Unsupported payment provider");
    }

    const wallet = await ensureWallet(userId);
    const clientReference = randomUUID();
    const providerPayload = await providerHandler.createIntent({
      clientReference,
      coinsAmount: input.coinsAmount,
      currency: input.currency ?? "USD",
      fiatAmount: input.fiatAmount,
    });

    const intent = await prisma.paymentIntent.create({
      data: {
        userId,
        walletId: wallet.id,
        provider,
        purpose: "WALLET_TOP_UP",
        status: providerPayload.status,
        coinsAmount: input.coinsAmount,
        fiatAmount:
          input.fiatAmount !== undefined && input.fiatAmount !== null
            ? new Prisma.Decimal(input.fiatAmount)
            : undefined,
        currency: input.currency ?? "USD",
        clientReference,
        providerReference: providerPayload.providerReference,
        verificationToken: providerPayload.verificationToken,
        metadata: providerPayload.metadata,
      },
    });

    return {
      id: intent.id,
      status: intent.status,
      provider: intent.provider,
      providerReference: intent.providerReference,
      verificationToken: intent.verificationToken,
      coinsAmount: intent.coinsAmount,
      fiatAmount: intent.fiatAmount,
      currency: intent.currency,
      manualReviewRequired: true,
    };
  },

  async verifyWalletTopUpIntent(
    actorId: string,
    intentId: string,
    input: {
      providerReference?: string;
      notes?: string;
    },
  ) {
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: intentId },
    });

    if (!intent) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Payment intent not found");
    }

    if (intent.purpose !== "WALLET_TOP_UP") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Unsupported payment intent");
    }

    if (intent.status === "COMPLETED") {
      return intent;
    }

    if (!intent.walletId || !intent.coinsAmount) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "This payment intent is missing wallet top-up details");
    }

    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const wallet = await tx.wallet.findUniqueOrThrow({
          where: { id: intent.walletId! },
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceCoins: {
              increment: intent.coinsAmount!,
            },
          },
        });

        const creditTransaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: intent.userId,
            type: "TOP_UP",
            amountCoins: intent.coinsAmount!,
            balanceAfterCoins: updatedWallet.balanceCoins,
            referenceType: "payment_intent",
            referenceId: intent.id,
            metadata: {
              actorId,
              notes: input.notes ?? null,
            },
          },
        });

        await tx.paymentIntent.update({
          where: { id: intent.id },
          data: {
            status: "COMPLETED",
            verifiedAt: new Date(),
            providerReference: input.providerReference ?? intent.providerReference,
            completedWalletTransactionId: creditTransaction.id,
            metadata: {
              ...(typeof intent.metadata === "object" && intent.metadata ? (intent.metadata as object) : {}),
              verifiedBy: actorId,
              verificationNotes: input.notes ?? null,
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return prisma.paymentIntent.findUniqueOrThrow({
      where: { id: intent.id },
    });
  },

  async sendRoomGift(
    senderId: string,
    roomId: string,
    input: {
      giftId: string;
      quantity?: number;
      receiverId?: string;
      clientRequestId: string;
      message?: string;
    },
  ) {
    const quantity = Math.max(1, input.quantity ?? 1);

    return prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const room = await tx.voiceRoom.findUnique({
          where: { id: roomId },
          include: {
            host: {
              select: {
                id: true,
                username: true,
                firstName: true,
                monetizationSuspendedAt: true,
                payoutEligibilityStatus: true,
              },
            },
            participants: {
              where: {
                userId: {
                  in: [senderId, input.receiverId ?? ""],
                },
              },
              select: {
                userId: true,
                role: true,
              },
            },
          },
        });

        if (!room || room.status !== "LIVE") {
          throw new ApiError(StatusCodes.BAD_REQUEST, "Gifts can only be sent in live rooms");
        }

        const receiverId = input.receiverId ?? room.hostId;

        if (receiverId === senderId) {
          throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot send gifts to yourself");
        }

        const senderParticipant = room.participants.find((participant: { userId: string }) => participant.userId === senderId);

        if (!senderParticipant) {
          throw new ApiError(StatusCodes.FORBIDDEN, "Join the room before sending a gift");
        }

        if (receiverId !== room.hostId) {
          const receiverParticipant = await tx.voiceParticipant.findUnique({
            where: {
              roomId_userId: {
                roomId,
                userId: receiverId,
              },
            },
          });

          if (!receiverParticipant) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Gift receiver must be active in the room");
          }
        }

        const receiver = await tx.user.findUnique({
          where: { id: receiverId },
          select: {
            id: true,
            username: true,
            firstName: true,
            avatarUrl: true,
            monetizationSuspendedAt: true,
            payoutEligibilityStatus: true,
            premiumBadgeVisible: true,
            premiumUntil: true,
          },
        });

        if (!receiver) {
          throw new ApiError(StatusCodes.NOT_FOUND, "Gift receiver not found");
        }

        if (receiver.monetizationSuspendedAt) {
          throw new ApiError(StatusCodes.FORBIDDEN, "This creator cannot receive gifts right now");
        }

        const gift = await tx.giftCatalogItem.findUnique({
          where: { id: input.giftId },
        });

        if (!gift || !gift.isActive) {
          throw new ApiError(StatusCodes.NOT_FOUND, "Gift item not found");
        }

        const totalCoinCost = gift.coinCost * quantity;
        const { platformCommissionCoins, creatorNetCoins } = getCommissionSplit(totalCoinCost);

        const senderWallet = await ensureWallet(senderId, tx);
        const receiverWallet = await ensureWallet(receiverId, tx);

        const debitResult = await tx.wallet.updateMany({
          where: {
            id: senderWallet.id,
            balanceCoins: {
              gte: totalCoinCost,
            },
          },
          data: {
            balanceCoins: {
              decrement: totalCoinCost,
            },
          },
        });

        if (debitResult.count !== 1) {
          throw new ApiError(StatusCodes.BAD_REQUEST, "Insufficient coin balance");
        }

        const debitedWallet = await tx.wallet.findUniqueOrThrow({
          where: { id: senderWallet.id },
        });

        const creditedWallet = await tx.wallet.update({
          where: { id: receiverWallet.id },
          data: {
            balanceCoins: {
              increment: creatorNetCoins,
            },
          },
        });

        const spendTransaction = await tx.walletTransaction.create({
          data: {
            walletId: senderWallet.id,
            userId: senderId,
            type: "GIFT_SPEND",
            amountCoins: -totalCoinCost,
            balanceAfterCoins: debitedWallet.balanceCoins,
            referenceType: "voice_room_gift",
            idempotencyKey: `${input.clientRequestId}:spend`,
            metadata: {
              roomId,
              receiverId,
              giftId: gift.id,
              quantity,
            },
          },
        });

        const receiptTransaction = await tx.walletTransaction.create({
          data: {
            walletId: receiverWallet.id,
            userId: receiverId,
            type: "GIFT_RECEIPT",
            amountCoins: creatorNetCoins,
            balanceAfterCoins: creditedWallet.balanceCoins,
            referenceType: "voice_room_gift",
            idempotencyKey: `${input.clientRequestId}:receipt`,
            metadata: {
              roomId,
              senderId,
              giftId: gift.id,
              quantity,
              platformCommissionCoins,
            },
          },
        });

        const giftEvent = await tx.roomGiftEvent.create({
          data: {
            roomId,
            senderId,
            receiverId,
            giftId: gift.id,
            quantity,
            totalCoinCost,
            platformCommissionCoins,
            creatorNetCoins,
            message: input.message?.trim() || null,
            clientRequestId: input.clientRequestId,
            spendTransactionId: spendTransaction.id,
            receiptTransactionId: receiptTransaction.id,
          },
          include: roomGiftEventInclude,
        });

        await tx.creatorLedgerEntry.create({
          data: {
            userId: receiverId,
            roomId,
            giftEventId: giftEvent.id,
            sourceType: "ROOM_GIFT",
            grossCoins: totalCoinCost,
            platformCommissionCoins,
            netCoins: creatorNetCoins,
            status: receiver.payoutEligibilityStatus === "ELIGIBLE" ? "AVAILABLE" : "HELD",
            availableAt: receiver.payoutEligibilityStatus === "ELIGIBLE" ? new Date() : null,
            holdReason:
              receiver.payoutEligibilityStatus === "ELIGIBLE"
                ? null
                : "Creator payout eligibility has not been approved yet.",
          },
        });

        await tx.notification.create({
          data: {
            recipientId: receiverId,
            actorId: senderId,
            type: "GIFT_RECEIVED",
            title: "You received a live room gift",
            body: `${gift.name} x${quantity}`,
            entityType: "voice-room",
            entityId: roomId,
          },
        });

        return {
          wallet: {
            balanceCoins: debitedWallet.balanceCoins,
            heldCoins: debitedWallet.heldCoins,
          },
          event: serializeGiftEvent(giftEvent),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    ).then((result: {
      wallet: {
        balanceCoins: number;
        heldCoins: number;
      };
      event: {
        receiver: {
          id: string;
        };
      };
    }) => {
      emitRealtime("voice-rooms:changed", { reason: "gift_sent", roomId, actorId: senderId });
      emitRealtimeToRoom(`voice-room:${roomId}`, "voice-room:changed", { reason: "gift_sent", roomId, actorId: senderId });
      emitRealtimeToUser(result.event.receiver.id, "notifications:changed", { reason: "gift_received", entityId: roomId });
      emitRealtimeToUser(senderId, "wallet:changed", { reason: "gift_sent" });
      emitRealtimeToUser(result.event.receiver.id, "wallet:changed", { reason: "gift_received" });
      return result;
    });
  },

  async getRoomGiftSnapshot(roomId: string) {
    const [recentEvents, topSupporters, roomLedgerSummary] = await Promise.all([
      prisma.roomGiftEvent.findMany({
        where: { roomId },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: roomGiftEventInclude,
      }),
      prisma.roomGiftEvent.groupBy({
        by: ["senderId"],
        where: { roomId },
        _sum: {
          totalCoinCost: true,
          quantity: true,
        },
        orderBy: {
          _sum: {
            totalCoinCost: "desc",
          },
        },
        take: 5,
      }),
      prisma.creatorLedgerEntry.aggregate({
        where: {
          roomId,
        },
        _sum: {
          grossCoins: true,
          platformCommissionCoins: true,
          netCoins: true,
        },
      }),
    ]);

    const supporterUsers = topSupporters.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: topSupporters.map((supporter: { senderId: string }) => supporter.senderId),
            },
          },
          select: {
            id: true,
            username: true,
            firstName: true,
            avatarUrl: true,
            premiumBadgeVisible: true,
            premiumUntil: true,
          },
        })
      : [];

    const supporterMap = new Map(supporterUsers.map((user: { id: string; username: string; firstName: string; avatarUrl: string | null; premiumBadgeVisible: boolean; premiumUntil: Date | null }) => [user.id, mapUserPreview(user)]));

    return {
      recentEvents: recentEvents.map(serializeGiftEvent),
      topSupporters: topSupporters.map((supporter: { senderId: string; _sum: { totalCoinCost: number | null; quantity: number | null } }) => ({
        user: supporterMap.get(supporter.senderId) ?? null,
        totalCoins: supporter._sum.totalCoinCost ?? 0,
        giftsSent: supporter._sum.quantity ?? 0,
      })),
      roomEarnings: {
        grossCoins: roomLedgerSummary._sum.grossCoins ?? 0,
        platformCommissionCoins: roomLedgerSummary._sum.platformCommissionCoins ?? 0,
        creatorNetCoins: roomLedgerSummary._sum.netCoins ?? 0,
      },
    };
  },

  async getAdminOverview() {
    const [giftStats, pendingPayments, failedPayments, heldLedger, suspendedMonetization] = await Promise.all([
      prisma.roomGiftEvent.aggregate({
        _sum: {
          totalCoinCost: true,
          creatorNetCoins: true,
          platformCommissionCoins: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.paymentIntent.count({
        where: {
          status: {
            in: ["PENDING", "REQUIRES_ACTION", "PROCESSING"],
          },
        },
      }),
      prisma.paymentIntent.count({
        where: {
          status: "FAILED",
        },
      }),
      prisma.creatorLedgerEntry.count({
        where: {
          status: "HELD",
        },
      }),
      prisma.user.count({
        where: {
          monetizationSuspendedAt: {
            not: null,
          },
        },
      }),
    ]);

    return {
      gifts: {
        totalEvents: giftStats._count.id,
        grossCoins: giftStats._sum.totalCoinCost ?? 0,
        creatorNetCoins: giftStats._sum.creatorNetCoins ?? 0,
        platformCommissionCoins: giftStats._sum.platformCommissionCoins ?? 0,
      },
      payments: {
        pending: pendingPayments,
        failed: failedPayments,
      },
      creatorLedger: {
        heldEntries: heldLedger,
      },
      users: {
        monetizationSuspended: suspendedMonetization,
      },
    };
  },

  async getAdminActivity() {
    const [giftEvents, paymentIntents, heldCreatorLedger] = await Promise.all([
      prisma.roomGiftEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: roomGiftEventInclude,
      }),
      prisma.paymentIntent.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.creatorLedgerEntry.findMany({
        where: {
          status: "HELD",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              avatarUrl: true,
              premiumBadgeVisible: true,
              premiumUntil: true,
            },
          },
          room: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      giftEvents: giftEvents.map(serializeGiftEvent),
      paymentIntents,
      heldCreatorLedger: heldCreatorLedger.map((entry: any) => ({
        ...entry,
        user: mapUserPreview(entry.user),
      })),
    };
  },

  async updateUserMonetizationState(
    userId: string,
    input: {
      monetizationSuspended?: boolean;
      suspensionReason?: string;
      payoutEligibilityStatus?: "INELIGIBLE" | "REVIEW" | "ELIGIBLE" | "RESTRICTED";
      payoutEligibilityReason?: string | null;
      premiumDisabled?: boolean;
    },
  ) {
    const now = new Date();

    return prisma.user.update({
      where: { id: userId },
      data: {
        monetizationSuspendedAt: input.monetizationSuspended ? now : input.monetizationSuspended === false ? null : undefined,
        monetizationSuspensionReason:
          input.monetizationSuspended === false
            ? null
            : input.suspensionReason !== undefined
              ? input.suspensionReason
              : undefined,
        payoutEligibilityStatus: input.payoutEligibilityStatus,
        payoutEligibilityReviewedAt: input.payoutEligibilityStatus ? now : undefined,
        payoutEligibilityReason:
          input.payoutEligibilityStatus !== undefined ? input.payoutEligibilityReason ?? null : undefined,
        premiumUntil: input.premiumDisabled ? null : undefined,
        premiumBadgeVisible: input.premiumDisabled ? false : undefined,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        premiumUntil: true,
        premiumBadgeVisible: true,
        monetizationSuspendedAt: true,
        monetizationSuspensionReason: true,
        payoutEligibilityStatus: true,
        payoutEligibilityReason: true,
      },
    });
  },
};
type PaymentProviderHandler = {
  createIntent: (input: {
    clientReference: string;
    coinsAmount: number;
    currency: string;
    fiatAmount?: number | null;
  }) => Promise<{
    status: "PENDING" | "REQUIRES_ACTION" | "PROCESSING";
    providerReference: string;
    verificationToken: string;
    metadata: Record<string, unknown>;
  }>;
  verifyIntent: () => Promise<{
    status: "COMPLETED";
  }>;
};
