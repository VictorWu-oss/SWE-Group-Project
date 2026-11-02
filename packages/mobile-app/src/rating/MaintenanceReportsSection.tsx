import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { MaintenanceCategory, MaintenanceReport, MaintenanceReportStatus } from '../main/types';
import { fetchMaintenanceReports, submitMaintenanceReport } from '../main/api';

type Props = {
  bathroomId: string;
  installationId: string;
};

const categories: MaintenanceCategory[] = [
  'cleanliness',
  'supplies',
  'fixture',
  'accessibility',
  'safety',
  'other',
];

const statusLabels: Record<MaintenanceReportStatus, string> = {
  open: 'Submitted',
  in_progress: 'In progress',
  resolved: 'Resolved',
  dismissed: 'Closed',
};

function formatUpdatedAt(timestamp: string) {
  return new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function MaintenanceReportsSection({ bathroomId, installationId }: Props) {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setReports([]);
    setLoadError('');
    fetchMaintenanceReports(bathroomId)
      .then((result) => {
        if (active) setReports(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error
            ? error.message
            : 'Maintenance reports are currently unavailable.');
        }
      });
    return () => { active = false; };
  }, [bathroomId, reload]);

  async function submit() {
    if (!category || description.trim().length < 5 || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    setMessage('');
    try {
      const report = await submitMaintenanceReport(
        bathroomId,
        installationId,
        category,
        description,
      );
      setReports((current) => [report, ...current]);
      setDescription('');
      setCategory(null);
      setMessage('Maintenance report submitted. It is not yet verified by staff.');
    } catch (error) {
      setSubmitError(error instanceof Error
        ? error.message
        : 'Your maintenance report could not be submitted. Please retry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Report a maintenance issue</Text>
      <Text style={styles.sectionNote}>
        Reports are sent for follow-up; submission does not mean staff have confirmed or resolved the issue. Do not include names or contact details.
      </Text>
      <View style={styles.categoryOptions}>
        {categories.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: category === option }}
            onPress={() => setCategory(option)}
            style={[styles.categoryChip, category === option && styles.selected]}
          >
            <Text style={[styles.categoryText, category === option && styles.selectedText]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the issue (5–500 characters)"
        placeholderTextColor="#858FA0"
        multiline
        maxLength={500}
        accessibilityLabel="Maintenance issue description"
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        disabled={!category || description.trim().length < 5 || submitting}
        onPress={() => { void submit(); }}
        style={[
          styles.submitButton,
          (!category || description.trim().length < 5 || submitting) && styles.disabled,
        ]}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Submit maintenance report</Text>}
      </Pressable>
      {message ? <Text accessibilityRole="alert" style={styles.successText}>{message}</Text> : null}
      {submitError ? <Text accessibilityRole="alert" style={styles.errorText}>{submitError}</Text> : null}
      {loadError ? (
        <View>
          <Text accessibilityRole="alert" style={styles.errorText}>{loadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setReload((current) => current + 1)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.sectionTitle}>Recent reports</Text>
      {reports.length === 0 ? (
        <Text style={styles.sectionNote}>
          {loadError ? 'Reports could not be loaded.' : 'No maintenance reports yet.'}
        </Text>
      ) : reports.map((report) => (
        <View key={report.id} style={styles.reportRow}>
          <Text style={styles.reportText}>{report.category}: {report.description}</Text>
          <Text style={styles.sectionNote}>
            {statusLabels[report.status]} | {formatUpdatedAt(report.updatedAt)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F6F8FB',
  },
  sectionTitle: { color: '#253143', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionNote: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 5 },
  categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#D5DCE6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryText: { color: '#475467', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  selected: { backgroundColor: '#EAF1FF', borderColor: '#3478F6' },
  selectedText: { color: '#225CC2' },
  input: {
    minHeight: 92,
    textAlignVertical: 'top',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D5DCE6',
    borderRadius: 12,
    backgroundColor: '#fff',
    color: '#263244',
    fontSize: 15,
    marginTop: 12,
  },
  submitButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3478F6',
    borderRadius: 14,
    marginTop: 16,
  },
  disabled: { opacity: 0.48 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successText: { color: '#126B4B', fontSize: 14, lineHeight: 20, marginTop: 14 },
  errorText: { color: '#B42318', fontSize: 14, lineHeight: 20, marginTop: 14 },
  retryButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 10 },
  retryText: { color: '#225CC2', fontSize: 13, fontWeight: '600' },
  reportRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D5DCE6', paddingTop: 8, marginTop: 8 },
  reportText: { color: '#344054', fontSize: 14, lineHeight: 20, marginTop: 4 },
});
