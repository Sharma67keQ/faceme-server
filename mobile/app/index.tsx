import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  fetchAdminDashboard,
  fetchAdminReports,
  createPost,
  fetchConversations,
  fetchDiscover,
  fetchFeed,
  fetchMessages,
  fetchProfile,
  login,
  register,
  sendMessage,
  updateReportStatus,
} from "@/lib/api";
import { t } from "@/lib/i18n";
import { clearAccessToken, loadAccessToken, saveAccessToken } from "@/lib/session";
import { useAppStore } from "@/store/use-app-store";

type AuthMode = "register" | "login";
type DiscoverData = Awaited<ReturnType<typeof fetchDiscover>>;
type ConversationItem = Awaited<ReturnType<typeof fetchConversations>>[number];
type MessageItem = Awaited<ReturnType<typeof fetchMessages>>[number];
type AdminMetrics = Awaited<ReturnType<typeof fetchAdminDashboard>>;
type AdminReport = Awaited<ReturnType<typeof fetchAdminReports>>[number];

export default function HomeScreen() {
  const {
    accessToken,
    activeTab,
    activities,
    hasEntered,
    language,
    likedPostIds,
    logout,
    posts,
    profile,
    savedPostIds,
    setActiveTab,
    setLanguage,
    setPosts,
    setProfile,
    setSession,
    stories,
    toggleLike,
    toggleSave,
  } = useAppStore();

  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booting, setBooting] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [composerBody, setComposerBody] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [discoverData, setDiscoverData] = useState<DiscoverData | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [conversationItems, setConversationItems] = useState<ConversationItem[]>([]);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [adminReports, setAdminReports] = useState<AdminReport[]>([]);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [moderatingReportId, setModeratingReportId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const storedToken = await loadAccessToken();

        if (!storedToken) {
          return;
        }

        const remoteProfile = await fetchProfile(storedToken);

        if (!active || !remoteProfile) {
          return;
        }

        setSession({
          accessToken: storedToken,
          profile: remoteProfile,
        });
      } catch {
        await clearAccessToken();
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    };

    void restore();

    return () => {
      active = false;
    };
  }, [setSession]);

  useEffect(() => {
    if (!hasEntered) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoadingFeed(true);
      setFeedError(null);

      try {
        const [remotePosts, remoteProfile] = await Promise.all([
          fetchFeed(),
          accessToken ? fetchProfile(accessToken) : Promise.resolve(null),
        ]);

        if (!active) {
          return;
        }

        setPosts(remotePosts);

        if (remoteProfile) {
          setProfile(remoteProfile);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setFeedError(readError(error));
      } finally {
        if (active) {
          setLoadingFeed(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [accessToken, hasEntered, setPosts, setProfile]);

  useEffect(() => {
    if (!hasEntered) {
      return;
    }

    let active = true;

    const loadDiscover = async () => {
      try {
        const data = await fetchDiscover();

        if (active) {
          setDiscoverData(data);
          setDiscoverError(null);
        }
      } catch (error) {
        if (active) {
          setDiscoverError(readError(error));
        }
      }
    };

    void loadDiscover();

    return () => {
      active = false;
    };
  }, [hasEntered]);

  useEffect(() => {
    if (!hasEntered || !accessToken) {
      return;
    }

    let active = true;

    const loadConversations = async () => {
      try {
        const data = await fetchConversations(accessToken);

        if (!active) {
          return;
        }

        setConversationItems(data);
        setConversationError(null);

        if (!selectedConversationId && data[0]) {
          setSelectedConversationId(data[0].id);
        }
      } catch (error) {
        if (active) {
          setConversationError(readError(error));
        }
      }
    };

    void loadConversations();

    return () => {
      active = false;
    };
  }, [accessToken, hasEntered, selectedConversationId]);

  useEffect(() => {
    if (!accessToken || !selectedConversationId) {
      setMessages([]);
      return;
    }

    let active = true;

    const loadMessages = async () => {
      try {
        const data = await fetchMessages(accessToken, selectedConversationId);

        if (active) {
          setMessages(data);
        }
      } catch (error) {
        if (active) {
          setConversationError(readError(error));
        }
      }
    };

    void loadMessages();

    return () => {
      active = false;
    };
  }, [accessToken, selectedConversationId]);

  useEffect(() => {
    if (!accessToken || (profile.role !== "ADMIN" && profile.role !== "MODERATOR")) {
      return;
    }

    let active = true;

    const loadAdmin = async () => {
      try {
        const [metrics, reports] = await Promise.all([
          fetchAdminDashboard(accessToken),
          fetchAdminReports(accessToken),
        ]);

        if (!active) {
          return;
        }

        setAdminMetrics(metrics);
        setAdminReports(reports);
        setAdminError(null);
      } catch (error) {
        if (active) {
          setAdminError(readError(error));
        }
      }
    };

    void loadAdmin();

    return () => {
      active = false;
    };
  }, [accessToken, profile.role]);

  const submitAuth = async () => {
    setSubmitting(true);
    setAuthError(null);

    try {
      if (authMode === "register") {
        const data = await register({
          email: email.trim().toLowerCase(),
          username: username.trim().replace(/^@/, ""),
          password,
          firstName: firstName.trim() || "FaceMe",
        });

        setSession({
          accessToken: data.accessToken,
          profile: {
            id: data.user.id,
            email: data.user.email,
            name: [data.user.firstName, data.user.lastName].filter(Boolean).join(" "),
            username: `@${data.user.username}`,
            bio: "Welcome to FaceMe.",
            location: "Johannesburg",
          },
        });
        await saveAccessToken(data.accessToken);
      } else {
        const data = await login({
          email: email.trim().toLowerCase(),
          password,
        });

        setSession({
          accessToken: data.accessToken,
          profile: {
            id: data.user.id,
            email: data.user.email,
            name: [data.user.firstName, data.user.lastName].filter(Boolean).join(" "),
            username: `@${data.user.username}`,
            bio: "Welcome back to FaceMe.",
            location: "Johannesburg",
          },
        });
        await saveAccessToken(data.accessToken);
      }
    } catch (error) {
      setAuthError(readError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitPost = async () => {
    if (!accessToken || !composerBody.trim()) {
      return;
    }

    setCreatingPost(true);
    setFeedError(null);

    try {
      const post = await createPost({
        accessToken,
        body: composerBody.trim(),
      });

      setPosts([post, ...posts]);
      setComposerBody("");
    } catch (error) {
      setFeedError(readError(error));
    } finally {
      setCreatingPost(false);
    }
  };

  const handleLogout = async () => {
    await clearAccessToken();
    logout();
  };

  const submitMessage = async () => {
    if (!accessToken || !selectedConversationId || !messageBody.trim()) {
      return;
    }

    setSendingMessage(true);

    try {
      const message = await sendMessage({
        accessToken,
        conversationId: selectedConversationId,
        text: messageBody.trim(),
      });

      setMessages([...messages, message]);
      setMessageBody("");
    } catch (error) {
      setConversationError(readError(error));
    } finally {
      setSendingMessage(false);
    }
  };

  const moderateReport = async (reportId: string, status: "REVIEWING" | "RESOLVED" | "REJECTED") => {
    if (!accessToken) {
      return;
    }

    setModeratingReportId(reportId);

    try {
      const updated = await updateReportStatus({
        accessToken,
        reportId,
        status,
      });

      setAdminReports(
        adminReports.map((report) => (report.id === reportId ? { ...report, status: updated.status } : report)),
      );
    } catch (error) {
      setAdminError(readError(error));
    } finally {
      setModeratingReportId(null);
    }
  };

  if (booting) {
    return (
      <View style={styles.container}>
        <GlowBackground />
        <View style={styles.bootScreen}>
          <ActivityIndicator color="#ffbd59" />
          <Text style={styles.sectionCopy}>{t(language, "restoringSession")}</Text>
        </View>
      </View>
    );
  }

  if (!hasEntered) {
    return (
      <View style={styles.container}>
        <GlowBackground />
        <ScrollView contentContainerStyle={styles.authScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <Text style={styles.eyebrow}>{t(language, "liveBackendConnected")}</Text>
            <Text style={styles.heroTitle}>{t(language, "welcomeTitle")}</Text>
            <Text style={styles.heroBody}>{t(language, "welcomeBody")}</Text>
          </View>

          <View style={styles.languageRow}>
            <Text style={styles.languageLabel}>{t(language, "language")}</Text>
            <View style={styles.languageSwitch}>
              <Pressable
                style={[styles.languageButton, language === "so" && styles.languageButtonActive]}
                onPress={() => setLanguage("so")}
              >
                <Text style={[styles.languageButtonText, language === "so" && styles.languageButtonTextActive]}>
                  {t(language, "somali")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.languageButton, language === "en" && styles.languageButtonActive]}
                onPress={() => setLanguage("en")}
              >
                <Text style={[styles.languageButtonText, language === "en" && styles.languageButtonTextActive]}>
                  {t(language, "english")}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeButton, authMode === "register" && styles.modeButtonActive]}
              onPress={() => setAuthMode("register")}
            >
              <Text style={[styles.modeButtonText, authMode === "register" && styles.modeButtonTextActive]}>
                {t(language, "createAccount")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeButton, authMode === "login" && styles.modeButtonActive]}
              onPress={() => setAuthMode("login")}
            >
              <Text style={[styles.modeButtonText, authMode === "login" && styles.modeButtonTextActive]}>
                {t(language, "signIn")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>
              {authMode === "register" ? t(language, "createYourAccount") : t(language, "signInToFaceMe")}
            </Text>

            {authMode === "register" ? (
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t(language, "firstName")}
                placeholderTextColor="#6f7688"
                style={styles.input}
              />
            ) : null}

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t(language, "emailAddress")}
              placeholderTextColor="#6f7688"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            {authMode === "register" ? (
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder={t(language, "username")}
                placeholderTextColor="#6f7688"
                autoCapitalize="none"
                style={styles.input}
              />
            ) : null}

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t(language, "password")}
              placeholderTextColor="#6f7688"
              secureTextEntry
              style={styles.input}
            />

            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

            <Pressable style={styles.primaryButton} onPress={submitAuth} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#17191f" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {authMode === "register" ? t(language, "createAccount") : t(language, "signIn")}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlowBackground />

      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarLabel}>FaceMe</Text>
          <Text style={styles.topBarTitle}>{tabTitle(activeTab, language)}</Text>
        </View>
        <Pressable style={styles.avatarBadge} onPress={handleLogout}>
          <Text style={styles.avatarBadgeText}>{initials(profile.name)}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "home" ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t(language, "createPost")}</Text>
              <TextInput
                value={composerBody}
                onChangeText={setComposerBody}
                placeholder={t(language, "shareSomething")}
                placeholderTextColor="#6f7688"
                multiline
                textAlignVertical="top"
                style={styles.composerInput}
              />
              <Pressable
                style={[styles.primaryButton, creatingPost && styles.primaryButtonMuted]}
                onPress={submitPost}
                disabled={creatingPost}
              >
                {creatingPost ? (
                  <ActivityIndicator color="#17191f" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t(language, "publishPost")}</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t(language, "stories")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.storyRow}>
                  {stories.map((story) => (
                    <View key={story.id} style={styles.storyCard}>
                      <View style={[styles.storyRing, { borderColor: story.accent }]}>
                        <Text style={styles.storyInitial}>{story.name.charAt(0)}</Text>
                      </View>
                      <Text style={styles.storyName}>{story.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {loadingFeed ? (
              <View style={styles.panel}>
                <ActivityIndicator color="#ffbd59" />
                <Text style={styles.sectionCopy}>{t(language, "loadingFeed")}</Text>
              </View>
            ) : null}

            {feedError ? (
              <View style={styles.panel}>
                <Text style={styles.errorText}>{feedError}</Text>
              </View>
            ) : null}

            {!loadingFeed && posts.length === 0 ? (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>{t(language, "noPostsTitle")}</Text>
                <Text style={styles.sectionCopy}>{t(language, "noPostsBody")}</Text>
              </View>
            ) : null}

            {posts.map((post) => {
              const liked = likedPostIds.includes(post.id);
              const saved = savedPostIds.includes(post.id);

              return (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.postAvatar}>
                      <Text style={styles.postAvatarText}>{initials(post.author)}</Text>
                    </View>
                    <View style={styles.postMeta}>
                      <Text style={styles.postAuthor}>{post.author}</Text>
                      <Text style={styles.postHandle}>
                        {post.handle} | {post.age}
                      </Text>
                    </View>
                    <View style={styles.moodPill}>
                      <Text style={styles.moodPillText}>{post.mood}</Text>
                    </View>
                  </View>

                  <Text style={styles.postBody}>{post.body}</Text>

                  <View style={styles.tagRow}>
                    {post.tags.map((tag) => (
                      <View key={tag} style={styles.tagPill}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.postActions}>
                    <Pressable style={styles.actionButton} onPress={() => toggleLike(post.id)}>
                      <Text style={[styles.actionText, liked && styles.actionTextActive]}>
                        {liked ? t(language, "liked") : t(language, "like")} | {post.likes + (liked ? 1 : 0)}
                      </Text>
                    </Pressable>
                    <View style={styles.actionButton}>
                      <Text style={styles.actionText}>{t(language, "comments")} | {post.comments}</Text>
                    </View>
                    <Pressable style={styles.actionButton} onPress={() => toggleSave(post.id)}>
                      <Text style={[styles.actionText, saved && styles.actionTextActive]}>
                        {saved ? t(language, "saved") : t(language, "save")} | {post.shares}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        {activeTab === "discover" ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t(language, "discoverCommunities")}</Text>
              <Text style={styles.sectionCopy}>{t(language, "discoverBody")}</Text>
            </View>

            {discoverError ? <Text style={styles.errorText}>{discoverError}</Text> : null}

            <View style={styles.topicGrid}>
              {(discoverData?.communities ?? []).map((community) => (
                <View key={community.id} style={styles.topicCard}>
                  <Text style={styles.topicTitle}>{community.name}</Text>
                  <Text style={styles.topicCopy}>
                    {community.description ?? "Community"} | {community._count.members} members
                  </Text>
                </View>
              ))}
              {(discoverData?.creators ?? []).map((creator) => (
                <View key={creator.id} style={styles.topicCard}>
                  <Text style={styles.topicTitle}>
                    {[creator.firstName, creator.lastName].filter(Boolean).join(" ")}
                  </Text>
                  <Text style={styles.topicCopy}>
                    @{creator.username} | {creator._count.followers} followers | {creator._count.posts} posts
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {activeTab === "inbox" ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t(language, "inbox")}</Text>
              <Text style={styles.sectionCopy}>{t(language, "inboxBody")}</Text>
            </View>

            {conversationError ? <Text style={styles.errorText}>{conversationError}</Text> : null}

            {conversationItems.map((conversation) => (
              <Pressable
                key={conversation.id}
                style={[
                  styles.conversationCard,
                  selectedConversationId === conversation.id && styles.conversationCardActive,
                ]}
                onPress={() => setSelectedConversationId(conversation.id)}
              >
                <View style={styles.conversationAvatar}>
                  <Text style={styles.conversationAvatarText}>{initials(conversation.title)}</Text>
                </View>
                <View style={styles.conversationBody}>
                  <Text style={styles.conversationName}>{conversation.title}</Text>
                  <Text style={styles.conversationStatus}>
                    {t(language, "updated")} {formatDateLabel(conversation.updatedAt)}
                  </Text>
                  <Text style={styles.conversationMessage}>{conversation.lastMessage}</Text>
                </View>
              </Pressable>
            ))}

            {selectedConversationId ? (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>{t(language, "conversation")}</Text>
                {messages.map((message) => (
                  <View key={message.id} style={styles.messageCard}>
                    <Text style={styles.messageAuthor}>
                      {[message.sender.firstName, message.sender.lastName].filter(Boolean).join(" ")} | @
                      {message.sender.username}
                    </Text>
                    <Text style={styles.messageBody}>{message.text ?? ""}</Text>
                  </View>
                ))}
                <TextInput
                  value={messageBody}
                  onChangeText={setMessageBody}
                  placeholder={t(language, "sendMessagePlaceholder")}
                  placeholderTextColor="#6f7688"
                  style={styles.input}
                />
                <Pressable
                  style={[styles.primaryButton, sendingMessage && styles.primaryButtonMuted]}
                  onPress={submitMessage}
                  disabled={sendingMessage}
                >
                  {sendingMessage ? (
                    <ActivityIndicator color="#17191f" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t(language, "sendMessage")}</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}

        {activeTab === "profile" ? (
          <>
            <View style={styles.profileHero}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarLargeText}>{initials(profile.name)}</Text>
              </View>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileUsername}>{profile.username}</Text>
              <Text style={styles.profileBio}>{profile.bio}</Text>
              <Text style={styles.profileLocation}>{profile.location}</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{posts.length}</Text>
                <Text style={styles.statLabel}>{t(language, "posts")}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{likedPostIds.length}</Text>
                <Text style={styles.statLabel}>{t(language, "liked")}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{savedPostIds.length}</Text>
                <Text style={styles.statLabel}>{t(language, "saved")}</Text>
              </View>
            </View>

            {activities.map((activity) => (
              <View key={activity.id} style={styles.panel}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDetail}>{activity.detail}</Text>
              </View>
            ))}

            {profile.role === "ADMIN" || profile.role === "MODERATOR" ? (
              <>
                <View style={styles.panel}>
                  <Text style={styles.sectionTitle}>{t(language, "adminDashboard")}</Text>
                  {adminError ? <Text style={styles.errorText}>{adminError}</Text> : null}
                  <View style={styles.statRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{adminMetrics?.users ?? 0}</Text>
                      <Text style={styles.statLabel}>{t(language, "users")}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{adminMetrics?.openReports ?? 0}</Text>
                      <Text style={styles.statLabel}>{t(language, "openReports")}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{adminMetrics?.conversations ?? 0}</Text>
                      <Text style={styles.statLabel}>{t(language, "conversationsStat")}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.panel}>
                  <Text style={styles.sectionTitle}>{t(language, "moderationQueue")}</Text>
                  {adminReports.map((report) => (
                    <View key={report.id} style={styles.reportCard}>
                      <Text style={styles.reportTitle}>
                        {report.targetType} | {report.status}
                      </Text>
                      <Text style={styles.reportBody}>{report.reason}</Text>
                      <Text style={styles.reportMeta}>
                        @{report.reporter.username} | {formatDateLabel(report.createdAt)}
                      </Text>
                      <View style={styles.reportActions}>
                        <Pressable
                          style={styles.reportAction}
                          onPress={() => moderateReport(report.id, "REVIEWING")}
                          disabled={moderatingReportId === report.id}
                        >
                          <Text style={styles.reportActionText}>{t(language, "markReviewing")}</Text>
                        </Pressable>
                        <Pressable
                          style={styles.reportAction}
                          onPress={() => moderateReport(report.id, "RESOLVED")}
                          disabled={moderatingReportId === report.id}
                        >
                          <Text style={styles.reportActionText}>{t(language, "markResolved")}</Text>
                        </Pressable>
                        <Pressable
                          style={styles.reportAction}
                          onPress={() => moderateReport(report.id, "REJECTED")}
                          disabled={moderatingReportId === report.id}
                        >
                          <Text style={styles.reportActionText}>{t(language, "rejectReport")}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.tabBar}>
        {[
          ["home", t(language, "home")],
          ["discover", t(language, "discover")],
          ["inbox", t(language, "messages")],
          ["profile", t(language, "profile")],
        ].map(([value, label]) => {
          const tab = value as "home" | "discover" | "inbox" | "profile";
          const selected = activeTab === tab;

          return (
            <Pressable key={tab} style={styles.tabButton} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function GlowBackground() {
  return (
    <>
      <View style={styles.backgroundGlowBlue} />
      <View style={styles.backgroundGlowPurple} />
      <View style={styles.backgroundGlowGold} />
    </>
  );
}

function tabTitle(tab: "home" | "discover" | "inbox" | "profile", language: "so" | "en") {
  if (tab === "home") {
    return t(language, "yourFeed");
  }

  if (tab === "discover") {
    return t(language, "discover");
  }

  if (tab === "inbox") {
    return t(language, "messages");
  }

  return t(language, "profile");
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function readError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121316",
  },
  authScroll: {
    paddingHorizontal: 24,
    paddingTop: 74,
    paddingBottom: 32,
    gap: 22,
  },
  bootScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  backgroundGlowBlue: {
    position: "absolute",
    left: -30,
    top: 140,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(20, 168, 255, 0.2)",
    shadowColor: "#1da1ff",
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  backgroundGlowPurple: {
    position: "absolute",
    right: 80,
    top: 240,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(123, 92, 255, 0.2)",
    shadowColor: "#7b5cff",
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  backgroundGlowGold: {
    position: "absolute",
    right: -10,
    top: 170,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(255, 179, 71, 0.2)",
    shadowColor: "#ffb347",
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  heroCard: {
    marginTop: 8,
    borderRadius: 30,
    padding: 24,
    backgroundColor: "rgba(22, 25, 31, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  heroLogo: {
    width: "100%",
    height: 280,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#ffbd59",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "#f5f7fb",
    marginBottom: 10,
  },
  heroBody: {
    fontSize: 16,
    lineHeight: 26,
    color: "#b9c2d6",
  },
  modeRow: {
    flexDirection: "row",
    gap: 12,
  },
  languageRow: {
    gap: 10,
  },
  languageLabel: {
    color: "#c4cde0",
    fontSize: 14,
    fontWeight: "700",
  },
  languageSwitch: {
    flexDirection: "row",
    gap: 10,
  },
  languageButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1d24",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  languageButtonActive: {
    backgroundColor: "#2a2e38",
    borderColor: "rgba(255, 189, 89, 0.6)",
  },
  languageButtonText: {
    color: "#b9c2d6",
    fontWeight: "700",
  },
  languageButtonTextActive: {
    color: "#ffbd59",
  },
  modeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1d24",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modeButtonActive: {
    backgroundColor: "#ffbd59",
  },
  modeButtonText: {
    color: "#b9c2d6",
    fontWeight: "700",
  },
  modeButtonTextActive: {
    color: "#17191f",
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(22, 25, 31, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f5f7fb",
    marginBottom: 14,
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: "#aeb7ca",
    marginTop: 10,
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#191c23",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    color: "#f5f7fb",
    fontSize: 15,
    marginBottom: 12,
  },
  composerInput: {
    minHeight: 120,
    borderRadius: 16,
    backgroundColor: "#191c23",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: "#f5f7fb",
    fontSize: 15,
    marginBottom: 12,
  },
  errorText: {
    color: "#ff8c8c",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffbd59",
    marginTop: 6,
  },
  primaryButtonMuted: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#17191f",
  },
  topBar: {
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#ffbd59",
    marginBottom: 6,
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f5f7fb",
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e2230",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  avatarBadgeText: {
    color: "#f5f7fb",
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 112,
    gap: 16,
  },
  panel: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(22, 25, 31, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  storyRow: {
    flexDirection: "row",
    gap: 14,
  },
  storyCard: {
    alignItems: "center",
    width: 76,
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#191c23",
    marginBottom: 8,
  },
  storyInitial: {
    color: "#f5f7fb",
    fontWeight: "800",
    fontSize: 20,
  },
  storyName: {
    color: "#c0c9da",
    fontSize: 12,
    fontWeight: "600",
  },
  postCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(22, 25, 31, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  postAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1b2030",
    marginRight: 12,
  },
  postAvatarText: {
    color: "#f5f7fb",
    fontWeight: "800",
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    color: "#f5f7fb",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  postHandle: {
    color: "#8b93a6",
    fontSize: 13,
  },
  moodPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 189, 89, 0.12)",
  },
  moodPillText: {
    color: "#ffbd59",
    fontSize: 12,
    fontWeight: "700",
  },
  postBody: {
    fontSize: 15,
    lineHeight: 24,
    color: "#d0d7e5",
    marginBottom: 14,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#191c23",
  },
  tagText: {
    color: "#80c9ff",
    fontSize: 12,
    fontWeight: "700",
  },
  postActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionButton: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#191c23",
  },
  actionText: {
    color: "#aab3c7",
    fontSize: 13,
    fontWeight: "700",
  },
  actionTextActive: {
    color: "#ffbd59",
  },
  topicGrid: {
    gap: 14,
  },
  topicCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "rgba(22, 25, 31, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  topicTitle: {
    color: "#f5f7fb",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  topicCopy: {
    color: "#9aa3b7",
    fontSize: 14,
  },
  conversationCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(22, 25, 31, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
  },
  conversationCardActive: {
    borderColor: "rgba(255, 189, 89, 0.6)",
  },
  conversationAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1b2030",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  conversationAvatarText: {
    color: "#f5f7fb",
    fontWeight: "800",
  },
  conversationBody: {
    flex: 1,
    gap: 3,
  },
  conversationName: {
    color: "#f5f7fb",
    fontSize: 16,
    fontWeight: "700",
  },
  conversationStatus: {
    color: "#80c9ff",
    fontSize: 12,
    fontWeight: "700",
  },
  conversationMessage: {
    color: "#aab3c7",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  messageCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#191c23",
    marginBottom: 10,
  },
  messageAuthor: {
    color: "#80c9ff",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  messageBody: {
    color: "#d0d7e5",
    fontSize: 14,
    lineHeight: 22,
  },
  reportCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#191c23",
    marginTop: 12,
  },
  reportTitle: {
    color: "#f5f7fb",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  reportBody: {
    color: "#c4cde0",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  reportMeta: {
    color: "#8d95a9",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  reportActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reportAction: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#232834",
  },
  reportActionText: {
    color: "#ffbd59",
    fontSize: 12,
    fontWeight: "700",
  },
  conversationMeta: {
    alignItems: "flex-end",
    gap: 8,
  },
  conversationTime: {
    color: "#8d95a9",
    fontSize: 12,
    fontWeight: "700",
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: "#ffbd59",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#16181e",
    fontSize: 12,
    fontWeight: "800",
  },
  profileHero: {
    alignItems: "center",
    borderRadius: 26,
    padding: 24,
    backgroundColor: "rgba(22, 25, 31, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  profileAvatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#1b2030",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  profileAvatarLargeText: {
    color: "#f5f7fb",
    fontSize: 28,
    fontWeight: "800",
  },
  profileName: {
    color: "#f5f7fb",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  profileUsername: {
    color: "#80c9ff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  profileBio: {
    color: "#c4cde0",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 8,
  },
  profileLocation: {
    color: "#8d95a9",
    fontSize: 13,
    fontWeight: "700",
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(22, 25, 31, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
  },
  statValue: {
    color: "#f5f7fb",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    color: "#9199ab",
    fontSize: 12,
    fontWeight: "700",
  },
  activityTitle: {
    color: "#f5f7fb",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  activityDetail: {
    color: "#aeb7ca",
    fontSize: 14,
    lineHeight: 22,
  },
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    borderRadius: 24,
    padding: 10,
    backgroundColor: "rgba(18, 19, 22, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tabButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  tabText: {
    color: "#8b93a6",
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#ffbd59",
  },
});
