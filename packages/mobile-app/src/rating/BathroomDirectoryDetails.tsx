import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Bathroom } from '../main/types';

type Props = {
  bathroom: Bathroom;
  directionError: string;
  onOpenDirections: () => void;
};

const amenityLabels = [
  ['babyChanging', 'Baby-changing station'],
  ['menstrualProducts', 'Menstrual products'],
  ['hooks', 'Hooks'],
  ['shelves', 'Shelves'],
] as const;

const accessibilityLabels = [
  ['wheelchairAccessible', 'Wheelchair accessibility'],
  ['grabBars', 'Grab bars'],
  ['accessibleSink', 'Accessible sink'],
  ['stepFreeRoute', 'Step-free route'],
] as const;

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

function featureStatus(verified: boolean, value: boolean | null | undefined) {
  if (!verified) return 'Unknown (not verified)';
  if (value === true) return 'Confirmed';
  if (value === false) return 'Confirmed unavailable';
  return 'Unknown';
}

function DirectoryFeatureList({
  title,
  verified,
  labels,
  values,
  description,
}: {
  title: string;
  verified: boolean;
  labels: ReadonlyArray<readonly [string, string]>;
  values: Record<string, boolean | null> | null;
  description?: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionNote}>{description}</Text> : null}
      {labels.map(([key, label]) => (
        <Text key={key} style={styles.featureLine}>
          {label}: {featureStatus(verified, values?.[key])}
        </Text>
      ))}
    </View>
  );
}

export function BathroomDirectoryDetails({
  bathroom,
  directionError,
  onOpenDirections,
}: Props) {
  return (
    <>
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
        onPress={onOpenDirections}
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

      <DirectoryFeatureList
        title="Restroom type and features"
        verified={bathroom.directoryVerified}
        labels={amenityLabels}
        values={bathroom.amenities}
        description={`Restroom type: ${bathroom.directoryVerified
          ? bathroom.restroomType?.replace('-', ' ') || 'Unknown'
          : 'Unverified / unknown'}`}
      />

      <DirectoryFeatureList
        title="Accessibility"
        verified={bathroom.directoryVerified}
        labels={accessibilityLabels}
        values={bathroom.accessibility}
      />
      <Text style={styles.sectionNote}>
        Unknown information does not mean a feature is unavailable. Verify routes and entrances before relying on them.
      </Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Safety information</Text>
        {bathroom.safetyInfo.length === 0 ? (
          <Text style={styles.sectionNote}>
            No approved safety information is available. The app does not guarantee that an area is safe.
          </Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
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
  errorText: { color: '#B42318', fontSize: 14, lineHeight: 20, marginTop: 14 },
});
