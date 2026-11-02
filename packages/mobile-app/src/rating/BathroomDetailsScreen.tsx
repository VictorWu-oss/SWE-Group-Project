import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import {
  ApiError,
  fetchBathroom,
  fetchMaintenanceReports,
  submitBathroomReview,
  submitMaintenanceReport,
} from '../main/api';
import type {
  Bathroom,
  Busyness,
  CleanlinessRating,
  MaintenanceCategory,
  MaintenanceReport,
} from '../main/types';

type Props = {
  bathroom: Bathroom;
  installationId: string;
  onClose: () => void;
  onBathroomUpdated: (bathroom: Bathroom) => void;
};

const cleanlinessOptions = [1, 2, 3, 4, 5] as const;
const busynessOptions: Busyness[] = ['Low', 'Medium', 'High'];
const maintenanceCategories: MaintenanceCategory[] = [
  'cleanliness',
  'supplies',
  'fixture',
  'accessibility',
  'safety',
  'other',
];
const amenityLabels = {
  babyChanging: 'Baby-changing station',
  menstrualProducts: 'Menstrual products',
  hooks: 'Hooks',
  shelves: 'Shelves',
} as const;
const accessibilityLabels = {
  wheelchairAccessible: 'Wheelchair accessibility',
  grabBars: 'Grab bars',
  accessibleSink: 'Accessible sink',
  stepFreeRoute: 'Step-free route',
} as const;
const weekdayLabels: Record<
  'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat',
  string
> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};

function formatReportedAt(timestamp: string | null) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function BathroomDetailsScreen({
  bathroom,
  installationId,
  onClose,
  onBathroomUpdated,
}: Props) {
  const [cleanliness, setCleanliness] = useState<CleanlinessRating | null>(null);
  const [busyness, setBusyness] = useState<Busyness | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [directionError, setDirectionError] = useState('');
  const [maintenanceReports, setMaintenanceReports] = useState<MaintenanceReport[]>([]);
  const [maintenanceError, setMaintenanceError] = useState('');
  const [maintenanceCategory, setMaintenanceCategory] = useState<MaintenanceCategory | null>(null);
  const [maintenanceDescription, setMaintenanceDescription] = useState('');
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceReload, setMaintenanceReload] = useState(0);

  useEffect(() => {
    setCleanliness(null);
    setBusyness(null);
    setError('');
    setSuccessMessage('');
    setDirectionError('');
    setMaintenanceDescription('');
    setMaintenanceMessage('');
    setMaintenanceCategory(null);
  }, [bathroom.id]);

  useEffect(() => {
    let active = true;
    setMaintenanceReports([]);
    setMaintenanceError('');
    fetchMaintenanceReports(bathroom.id)
      .then((reports) => {
        if (active) setMaintenanceReports(reports);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setMaintenanceError(loadError instanceof Error
            ? loadError.message
            : 'Maintenance reports are currently unavailable.');
        }
      });
    return () => { active = false; };
  }, [bathroom.id, maintenanceReload]);

  async function handleSubmit() {
    if (cleanliness === null || busyness === null || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const updated = await submitBathroomReview(
        bathroom.id,
        installationId,
        cleanliness,
        busyness,
      );
      onBathroomUpdated(updated);
      setCleanliness(null);
      setBusyness(null);
      setSuccessMessage('Thanks. Your rating was saved and the bathroom summary is up to date.');
    } catch (submitError) {
      const message = submitError instanceof Error
        ? submitError.message
        : 'Your review could not be saved.';
      setError(message);
      if (submitError instanceof ApiError && submitError.status === 409) {
        try {
          onBathroomUpdated(await fetchBathroom(bathroom.id, installationId));
        } catch (refreshError) {
          const refreshMessage = refreshError instanceof Error
            ? refreshError.message
            : 'Bathroom details could not be refreshed.';
          setError(`${message} ${refreshMessage}`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  const reportedAt = formatReportedAt(bathroom.busynessReportedAt);
  const maintenanceStatusLabel: Record<MaintenanceReport['status'], string> = {
    open: 'Submitted',
    in_progress: 'In progress',
    resolved: 'Resolved',
    dismissed: 'Closed',
  };

  async function openDirections() {
    if (
      bathroom.latitude === null
      || bathroom.longitude === null
      || !Number.isFinite(bathroom.latitude)
      || !Number.isFinite(bathroom.longitude)
    ) {
      setDirectionError('Directions are unavailable because this bathroom has no verified destination coordinates.');
      return;
    }
    setDirectionError('');
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${bathroom.latitude},${bathroom.longitude}`,
    )}`;
    try {
      await Linking.openURL(url);
    } catch (openError) {
      setDirectionError(openError instanceof Error
        ? `A maps app could not be opened. ${openError.message}`
        : 'A maps app could not be opened. Copy the destination from the bathroom map instead.');
    }
  }

  async function handleMaintenanceSubmit() {
    if (
      !maintenanceCategory
      || maintenanceDescription.trim().length < 5
      || maintenanceSubmitting
    ) return;
    setMaintenanceSubmitting(true);
    setMaintenanceError('');
    setMaintenanceMessage('');
    try {
      const report = await submitMaintenanceReport(
        bathroom.id,
        installationId,
        maintenanceCategory,
        maintenanceDescription,
      );
      setMaintenanceReports((current) => [report, ...current]);
      setMaintenanceDescription('');
      setMaintenanceCategory(null);
      setMaintenanceMessage('Maintenance report submitted. It is marked submitted and is not yet verified by staff.');
    } catch (submitError) {
      setMaintenanceError(submitError instanceof Error
        ? submitError.message
        : 'Your maintenance report could not be submitted. Please retry.');
    } finally {
      setMaintenanceSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.navigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to bathroom map"
          onPress={onClose}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={21} color="#475467" />
          <Text style={styles.backText}>Map</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>BATHROOM DETAILS</Text>
        <Text style={styles.title}>{bathroom.name}</Text>
        <Text style={styles.building}>{bathroom.building}</Text>

        {bathroom.demo ? (
          <Text style={styles.demoLabel}>DEMO LOCATION | VERIFY BEFORE USE</Text>
        ) : null}
        <Text style={styles.directoryStatus}>
          {bathroom.directoryVerified
            ? `Directory verified${bathroom.verificationSource ? ` from ${bathroom.verificationSource}` : ''}${bathroom.verifiedAt ? ` on ${formatReportedAt(bathroom.verifiedAt)}` : ''}.`
            : 'Directory information is unverified. Confirm details locally before relying on them.'}
        </Text>

        <View style={styles.hoursCard}>
          <Text style={styles.sectionTitle}>Operating hours</Text>
          <Text style={[
            styles.openState,
            bathroom.openStatus === 'open' && styles.openStateOpen,
            bathroom.openStatus === 'closed' && styles.openStateClosed,
          ]}
          >
            {bathroom.openStatus === 'open'
              ? 'Expected to be open'
              : bathroom.openStatus === 'closed'
                ? 'Expected to be closed'
                : 'Hours unknown'}
          </Text>
          {bathroom.hours && bathroom.directoryVerified ? (
            Object.entries(bathroom.hours).map(([day, intervals]) => (
              <Text key={day} style={styles.hoursLine}>
                {weekdayLabels[day as keyof typeof weekdayLabels]}: {intervals === null
                  ? 'Unknown'
                  : intervals.length === 0
                    ? 'Closed'
                    : intervals.map(({ open, close }) => (
                      `${open}–${close}${close < open ? ' (next day)' : ''}`
                    )).join(', ')}
              </Text>
            ))
          ) : (
            <Text style={styles.sectionNote}>No verified operating schedule is available.</Text>
          )}
          {bathroom.timezone && bathroom.directoryVerified ? (
            <Text style={styles.sectionNote}>Local time: {bathroom.timezone}</Text>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => { void openDirections(); }}
          style={({ pressed }) => [styles.directionsButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="directions" size={20} color="#fff" />
          <Text style={styles.directionsText}>Get directions</Text>
        </Pressable>
        <Text style={styles.sectionNote}>
          Your navigation app will use your current location when available; otherwise choose a starting point there.
        </Text>
        {directionError ? <Text accessibilityRole="alert" style={styles.errorText}>{directionError}</Text> : null}
        {bathroom.indoorDirections && bathroom.directoryVerified ? (
          <Text style={styles.sectionNote}>Verified building directions: {bathroom.indoorDirections}</Text>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <View style={styles.summaryValueRow}>
              <MaterialCommunityIcons name="star" size={17} color="#E89A18" />
              <Text style={styles.summaryValue}>
                {bathroom.averageCleanliness?.toFixed(1) ?? 'N/A'}
              </Text>
            </View>
            <Text style={styles.summaryCaption}>
              {bathroom.reviewCount ? `${bathroom.reviewCount} reviews` : 'No reviews yet'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text style={styles.busynessValue}>{bathroom.busyness || 'Not reported'}</Text>
            <Text style={styles.summaryCaption}>Community busyness</Text>
          </View>
        </View>

        <Text style={styles.freshness}>
          {bathroom.busynessStatus === 'stale'
            ? `Stale community report from ${reportedAt || 'an unknown time'} | not live occupancy`
            : bathroom.busynessStatus === 'current' && reportedAt
              ? `Last reported ${reportedAt} | may be outdated; not live occupancy`
              : bathroom.busyness
                ? 'Community report freshness is unavailable | not live occupancy'
                : 'No busyness reports yet | not live occupancy'}
        </Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Restroom type and features</Text>
          <Text style={styles.sectionNote}>
            Restroom type: {bathroom.directoryVerified
              ? bathroom.restroomType?.replace('-', ' ') || 'Unknown'
              : 'Unverified / unknown'}
          </Text>
          {Object.entries(amenityLabels).map(([key, label]) => (
            <Text key={key} style={styles.featureLine}>
              {label}: {bathroom.directoryVerified
                ? bathroom.amenities?.[key as keyof typeof amenityLabels] === true
                  ? 'Confirmed'
                  : bathroom.amenities?.[key as keyof typeof amenityLabels] === false
                    ? 'Confirmed unavailable'
                    : 'Unknown'
                : 'Unknown (not verified)'}
            </Text>
          ))}
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          {Object.entries(accessibilityLabels).map(([key, label]) => (
            <Text key={key} style={styles.featureLine}>
              {label}: {bathroom.directoryVerified
                ? bathroom.accessibility?.[key as keyof typeof accessibilityLabels] === true
                  ? 'Confirmed'
                  : bathroom.accessibility?.[key as keyof typeof accessibilityLabels] === false
                    ? 'Confirmed unavailable'
                    : 'Unknown'
                : 'Unknown (not verified)'}
            </Text>
          ))}
          <Text style={styles.sectionNote}>
            Unknown information does not mean a feature is unavailable. Verify routes and entrances before relying on them.
          </Text>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Safety information</Text>
          {bathroom.safetyInfo.length === 0 ? (
            <Text style={styles.sectionNote}>No approved safety information is available. The app does not guarantee that an area is safe.</Text>
          ) : bathroom.safetyInfo.map((entry, index) => (
            <View key={`${entry.updatedAt}-${index}`} style={styles.safetyEntry}>
              <Text style={styles.featureLine}>
                {entry.kind === 'user_report'
                  ? entry.verified ? 'Reviewed user report' : 'User report (unverified)'
                  : entry.verified ? 'Source-verified information' : 'Unverified source context'}
                : {entry.text}
              </Text>
              <Text style={styles.sectionNote}>
                Source: {entry.source} | Updated {formatReportedAt(entry.updatedAt) || 'unknown'}
              </Text>
            </View>
          ))}
        </View>

        {bathroom.reviewedToday ? (
          <View style={styles.alreadyReviewed}>
            <MaterialCommunityIcons name="check-circle-outline" size={19} color="#16845D" />
            <Text style={styles.alreadyReviewedText}>
              You&apos;ve submitted today&apos;s review for this bathroom.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Rate cleanliness</Text>
            <View style={styles.stars}>
              {cleanlinessOptions.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setCleanliness(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: cleanliness === value }}
                  accessibilityLabel={`${value} out of 5 cleanliness`}
                  style={styles.starButton}
                >
                  <MaterialCommunityIcons
                    name={cleanliness !== null && value <= cleanliness ? 'star' : 'star-outline'}
                    size={30}
                    color={cleanliness !== null && value <= cleanliness ? '#E89A18' : '#C2CAD4'}
                  />
                </Pressable>
              ))}
              <Text style={styles.ratingHint}>
                {cleanliness === null ? 'Tap a star' : `${cleanliness}/5`}
              </Text>
            </View>

            <Text style={[styles.formTitle, styles.busynessHeading]}>Report busyness</Text>
            <View style={styles.busynessOptions}>
              {busynessOptions.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: busyness === option }}
                  accessibilityLabel={`${option} busyness`}
                  onPress={() => setBusyness(option)}
                  style={[
                    styles.busynessOption,
                    busyness === option && styles.busynessSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.busynessOptionText,
                      busyness === option && styles.busynessSelectedText,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.formNote}>
              Reports are anonymous and limited to one per bathroom each calendar day on this
              installation.
            </Text>
            {cleanliness === null || busyness === null ? (
              <Text style={styles.sectionNote}>Choose a cleanliness rating and busyness level to submit.</Text>
            ) : null}
          </View>
        )}

        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        {successMessage ? (
          <Text accessibilityRole="alert" style={styles.successText}>{successMessage}</Text>
        ) : null}
        {!bathroom.reviewedToday ? (
          <Pressable
            accessibilityRole="button"
            disabled={cleanliness === null || busyness === null || submitting}
            onPress={() => { void handleSubmit(); }}
            style={[
              styles.submitButton,
              (cleanliness === null || busyness === null || submitting) && styles.submitDisabled,
            ]}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Submit review</Text>}
          </Pressable>
        ) : null}
        <Text style={styles.privacyNote}>
          No account needed. One review per installation per bathroom per LA calendar day; this
          limits repeats, but can&apos;t guarantee one review per person.
        </Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Report a maintenance issue</Text>
          <Text style={styles.sectionNote}>
            Reports are sent to the project service for follow-up; submission does not mean staff have confirmed or resolved the issue. Do not include names or contact details.
          </Text>
          <View style={styles.categoryOptions}>
            {maintenanceCategories.map((category) => (
              <Pressable
                key={category}
                accessibilityRole="button"
                accessibilityState={{ selected: maintenanceCategory === category }}
                onPress={() => setMaintenanceCategory(category)}
                style={[
                  styles.categoryChip,
                  maintenanceCategory === category && styles.busynessSelected,
                ]}
              >
                <Text style={[
                  styles.categoryText,
                  maintenanceCategory === category && styles.busynessSelectedText,
                ]}
                >
                  {category.replace('_', ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={maintenanceDescription}
            onChangeText={setMaintenanceDescription}
            placeholder="Describe the issue (5–500 characters)"
            placeholderTextColor="#858FA0"
            multiline
            maxLength={500}
            accessibilityLabel="Maintenance issue description"
            style={styles.maintenanceInput}
          />
          <Pressable
            accessibilityRole="button"
            disabled={
              !maintenanceCategory
              || maintenanceDescription.trim().length < 5
              || maintenanceSubmitting
            }
            onPress={() => { void handleMaintenanceSubmit(); }}
            style={[
              styles.submitButton,
              (!maintenanceCategory || maintenanceDescription.trim().length < 5 || maintenanceSubmitting)
                && styles.submitDisabled,
            ]}
          >
            {maintenanceSubmitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Submit maintenance report</Text>}
          </Pressable>
          {maintenanceMessage ? (
            <Text accessibilityRole="alert" style={styles.successText}>{maintenanceMessage}</Text>
          ) : null}
          {maintenanceError ? (
            <View>
              <Text accessibilityRole="alert" style={styles.errorText}>{maintenanceError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMaintenanceReload((current) => current + 1)}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Retry loading reports</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.sectionTitle}>Recent reports</Text>
          {maintenanceReports.length === 0 ? (
            <Text style={styles.sectionNote}>
              {maintenanceError ? 'Reports could not be loaded. Retry by reopening this page.' : 'No maintenance reports yet.'}
            </Text>
          ) : maintenanceReports.map((report) => (
            <View key={report.id} style={styles.reportRow}>
              <Text style={styles.featureLine}>
                {report.category}: {report.description}
              </Text>
              <Text style={styles.sectionNote}>
                {maintenanceStatusLabel[report.status]} | {formatReportedAt(report.updatedAt) || 'Time unknown'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  navigation: {
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E7EC',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', padding: 6 },
  backText: { color: '#475467', fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 28 },
  kicker: { color: '#667085', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#17212F', fontSize: 28, fontWeight: '700', marginTop: 8 },
  building: { color: '#667085', fontSize: 17, marginTop: 3 },
  demoLabel: {
    alignSelf: 'flex-start',
    color: '#8C5B0B',
    backgroundColor: '#FFF4D8',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.35,
    marginTop: 14,
  },
  directoryStatus: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 10 },
  hoursCard: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F6F8FB',
    borderRadius: 14,
  },
  sectionCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F6F8FB',
  },
  sectionTitle: { color: '#253143', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionNote: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 5 },
  openState: { color: '#475467', fontSize: 15, fontWeight: '700', marginBottom: 7 },
  openStateOpen: { color: '#126B4B' },
  openStateClosed: { color: '#9B2C23' },
  hoursLine: { color: '#475467', fontSize: 13, lineHeight: 19 },
  featureLine: { color: '#344054', fontSize: 14, lineHeight: 20, marginTop: 4 },
  safetyEntry: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D5DCE6', paddingTop: 8, marginTop: 8 },
  directionsButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16845D',
    borderRadius: 12,
    marginTop: 12,
  },
  directionsText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F6F8FB',
    borderRadius: 14,
  },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryValue: { color: '#263244', fontSize: 19, fontWeight: '700' },
  summaryCaption: { color: '#667085', fontSize: 13 },
  summaryDivider: { width: 1, backgroundColor: '#E2E7EF', marginHorizontal: 8 },
  busynessValue: { color: '#263244', fontSize: 15, fontWeight: '700', marginVertical: 2 },
  freshness: { color: '#475467', fontSize: 14, marginTop: 12, lineHeight: 20 },
  alreadyReviewed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF8F1',
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  alreadyReviewedText: { flex: 1, color: '#126B4B', fontSize: 15, lineHeight: 21 },
  form: { marginTop: 24 },
  formTitle: { color: '#253143', fontSize: 16, fontWeight: '700' },
  stars: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  starButton: { padding: 3 },
  ratingHint: { color: '#667085', fontSize: 14, marginLeft: 8 },
  busynessHeading: { marginTop: 24 },
  busynessOptions: { flexDirection: 'row', gap: 9, marginTop: 10 },
  busynessOption: {
    minWidth: 74,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D5DCE6',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  busynessSelected: { backgroundColor: '#EAF1FF', borderColor: '#3478F6' },
  busynessOptionText: { color: '#475467', fontSize: 14, fontWeight: '600' },
  busynessSelectedText: { color: '#225CC2' },
  formNote: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 16 },
  errorText: { color: '#B42318', fontSize: 14, lineHeight: 20, marginTop: 14 },
  successText: { color: '#126B4B', fontSize: 14, lineHeight: 20, marginTop: 14 },
  submitButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3478F6',
    borderRadius: 14,
    marginTop: 22,
  },
  submitDisabled: { opacity: 0.48 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  privacyNote: { color: '#667085', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 15 },
  categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#D5DCE6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryText: { color: '#475467', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  maintenanceInput: {
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
  reportRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D5DCE6', paddingTop: 8, marginTop: 8 },
  retryButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 10 },
  retryText: { color: '#225CC2', fontSize: 13, fontWeight: '600' },
});
