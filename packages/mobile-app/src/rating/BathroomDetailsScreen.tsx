import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { ApiError, fetchBathroom, submitBathroomReview } from '../main/api';
import type { Bathroom, Busyness, CleanlinessRating } from '../main/types';
import { BathroomDirectoryDetails } from './BathroomDirectoryDetails';
import { MaintenanceReportsSection } from './MaintenanceReportsSection';

type Props = {
  bathroom: Bathroom;
  installationId: string;
  onClose: () => void;
  onBathroomUpdated: (bathroom: Bathroom) => void;
};

const cleanlinessOptions = [1, 2, 3, 4, 5] as const;
const busynessOptions: Busyness[] = ['Low', 'Medium', 'High'];

function formatReportedAt(timestamp: string | null) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function restroomRoomLabel(name: string) {
  return name.replace(/^All-gender restrooms?\s*·\s*/i, '') || 'Room information unavailable';
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
        <Text style={styles.title}>{bathroom.building}</Text>
        <Text style={styles.building}>
          All-gender restroom · {restroomRoomLabel(bathroom.name)}
        </Text>

        {bathroom.demo ? (
          <Text style={styles.demoLabel}>DEMO LOCATION | VERIFY BEFORE USE</Text>
        ) : null}
        <BathroomDirectoryDetails
          bathroom={bathroom}
          directionError={directionError}
          onOpenDirections={() => { void openDirections(); }}
        />

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

        <MaintenanceReportsSection
          bathroomId={bathroom.id}
          installationId={installationId}
        />
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
  sectionNote: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 5 },
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
});
