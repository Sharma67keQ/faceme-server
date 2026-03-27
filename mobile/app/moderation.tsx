import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { moderationService } from "@/services/moderation";
import { useAuthStore } from "@/store/auth-store";
import { colors, radius, spacing } from "@/utils/theme";

const actionReason = "Reviewed in Faceme admin moderation";

const reportActions: Record<
  string,
  Array<{ label: string; run: (targetId: string, reportId: string) => Promise<unknown> }>
> = {
  POST: [
    { label: "Remove post", run: (targetId, reportId) => moderationService.moderatePost(targetId, "remove", actionReason, reportId) },
    { label: "Remove media", run: (targetId, reportId) => moderationService.moderatePost(targetId, "remove-media", actionReason, reportId) },
  ],
  COMMENT: [
    { label: "Remove comment", run: (targetId, reportId) => moderationService.moderateComment(targetId, "remove", actionReason, reportId) },
  ],
  REEL: [
    { label: "Remove reel", run: (targetId, reportId) => moderationService.moderateReel(targetId, "remove", actionReason, reportId) },
  ],
  STATUS: [
    { label: "Remove status", run: (targetId, reportId) => moderationService.moderateStatus(targetId, "remove", actionReason, reportId) },
    { label: "Remove media", run: (targetId, reportId) => moderationService.moderateStatus(targetId, "remove-media", actionReason, reportId) },
  ],
  USER: [
    { label: "Suspend user", run: (targetId, reportId) => moderationService.moderateUser(targetId, "suspend", actionReason, reportId) },
    { label: "Ban user", run: (targetId, reportId) => moderationService.moderateUser(targetId, "ban", actionReason, reportId) },
  ],
  GROUP: [
    { label: "Hide group", run: (targetId, reportId) => moderationService.moderateGroup(targetId, "remove", actionReason, reportId) },
  ],
  PAGE: [
    { label: "Hide page", run: (targetId, reportId) => moderationService.moderatePage(targetId, "remove", actionReason, reportId) },
  ],
};

export default function ModerationScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasModerationAccess = user?.role === "ADMIN" || user?.role === "MODERATOR";

  const { data: overview } = useQuery({
    queryKey: ["moderation-overview"],
    queryFn: moderationService.getOverview,
    enabled: hasModerationAccess,
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["moderation-reports"],
    queryFn: moderationService.getReports,
    enabled: hasModerationAccess,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["moderation-logs"],
    queryFn: moderationService.getLogs,
    enabled: hasModerationAccess,
  });

  const refreshModeration = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["moderation-overview"] }),
      queryClient.invalidateQueries({ queryKey: ["moderation-reports"] }),
      queryClient.invalidateQueries({ queryKey: ["moderation-logs"] }),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "REVIEWING" | "RESOLVED" | "REJECTED" }) =>
      moderationService.updateReport(id, status, actionReason),
    onSuccess: refreshModeration,
  });

  const actionMutation = useMutation({
    mutationFn: ({
      run,
      targetId,
      reportId,
    }: {
      run: (targetId: string, reportId: string) => Promise<unknown>;
      targetId: string;
      reportId: string;
    }) => run(targetId, reportId),
    onSuccess: refreshModeration,
  });

  if (!hasModerationAccess) {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <Text style={styles.title}>Moderation</Text>
          <Text style={styles.body}>Admin and moderator access is required for this workspace.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.title}>Moderation control</Text>
        {overview ? (
          <View style={styles.grid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{overview.reports.open}</Text>
              <Text style={styles.metricLabel}>Open reports</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{overview.reports.reviewing}</Text>
              <Text style={styles.metricLabel}>In review</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{overview.users.suspended}</Text>
              <Text style={styles.metricLabel}>Suspended users</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{overview.users.banned}</Text>
              <Text style={styles.metricLabel}>Banned users</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reports</Text>
          {reports.map((report) => (
            <View key={report.id} style={styles.card}>
              <Text style={styles.cardTitle}>{report.targetType} report</Text>
              <Text style={styles.body}>{report.reason}</Text>
              <Text style={styles.meta}>
                Reporter: @{report.reporter?.username} • Status: {report.status}
              </Text>
              <Text style={styles.meta}>Target: {report.targetId}</Text>
              <View style={styles.actions}>
                <Button
                  label="Review"
                  variant="secondary"
                  disabled={updateMutation.isPending}
                  onPress={() => updateMutation.mutate({ id: report.id, status: "REVIEWING" })}
                />
                <Button
                  label="Resolve"
                  disabled={updateMutation.isPending}
                  onPress={() => updateMutation.mutate({ id: report.id, status: "RESOLVED" })}
                />
                <Button
                  label="Reject"
                  variant="secondary"
                  disabled={updateMutation.isPending}
                  onPress={() => updateMutation.mutate({ id: report.id, status: "REJECTED" })}
                />
              </View>
              <View style={styles.actions}>
                {(reportActions[report.targetType] ?? []).map((action) => (
                  <Button
                    key={action.label}
                    label={action.label}
                    variant="secondary"
                    disabled={actionMutation.isPending}
                    onPress={() =>
                      actionMutation.mutate({
                        run: action.run,
                        targetId: report.targetId,
                        reportId: report.id,
                      })
                    }
                  />
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent actions</Text>
          {logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <Text style={styles.cardTitle}>{log.action}</Text>
              <Text style={styles.meta}>
                {log.targetType} • {log.targetId}
              </Text>
              <Text style={styles.meta}>
                @{log.actor.username} • {new Date(log.createdAt).toLocaleString()}
              </Text>
              {log.reason ? <Text style={styles.body}>{log.reason}</Text> : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  list: {
    gap: spacing.lg,
    paddingBottom: 120,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricCard: {
    minWidth: "47%",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  logCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "800",
  },
  body: {
    color: colors.text,
    lineHeight: 20,
  },
  meta: {
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.sm,
  },
});
