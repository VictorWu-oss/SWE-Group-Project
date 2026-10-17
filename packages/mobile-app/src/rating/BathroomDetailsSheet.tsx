import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { submitBathroomReview } from '../main/api';
import type { Bathroom, Busyness } from '../main/types';

type Props = {
  bathroom: Bathroom | null;
  installationId: string;
  visible: boolean;
  onClose: () => void;
  onBathroomUpdated: (bathroom: Bathroom) => void;
};

const busynessOptions: Busyness[] = ['Low', 'Medium', 'High'];

function formatReportedAt(timestamp: string | null) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function BathroomDetailsSheet({ bathroom, installationId, visible, onClose, onBathroomUpdated }: Props) {
  const [cleanliness, setCleanliness] = useState<number | null>(null);
  const [busyness, setBusyness] = useState<Busyness | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!bathroom) return null;

  async function handleSubmit() {
    if (!cleanliness || !busyness || !bathroom) return;
    setSubmitting(true);
    setError('');
    try {
      const updated = await submitBathroomReview(bathroom.id, installationId, cleanliness, busyness);
      onBathroomUpdated(updated);
      setCleanliness(null);
      setBusyness(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your review could not be saved.');
    } finally {
      setSubmitting(false);
    }
  }

  const reportedAt = formatReportedAt(bathroom.busynessReportedAt);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} accessibilityLabel="Close bathroom details" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <View style={styles.titleGroup}>
              <Text style={styles.kicker}>BATHROOM DETAILS</Text>
              <Text style={styles.title}>{bathroom.name}</Text>
              <Text style={styles.building}>{bathroom.building}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close details">
              <MaterialCommunityIcons name="close" size={21} color="#475467" />
            </Pressable>
          </View>

          {bathroom.demo ? <Text style={styles.demoLabel}>DEMO LOCATION | VERIFY BEFORE USE</Text> : null}

          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <View style={styles.summaryValueRow}>
                <MaterialCommunityIcons name="star" size={17} color="#E89A18" />
                <Text style={styles.summaryValue}>{bathroom.averageCleanliness?.toFixed(1) ?? 'N/A'}</Text>
              </View>
              <Text style={styles.summaryCaption}>{bathroom.reviewCount ? `${bathroom.reviewCount} reviews` : 'No reviews yet'}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCell}>
              <Text style={styles.busynessValue}>{bathroom.busyness || 'Not reported'}</Text>
              <Text style={styles.summaryCaption}>Community busyness</Text>
            </View>
          </View>

          <Text style={styles.freshness}>
            {reportedAt ? `Last reported ${reportedAt} | not live occupancy` : 'No busyness reports yet | not live occupancy'}
          </Text>

          {bathroom.reviewedToday ? (
            <View style={styles.alreadyReviewed}>
              <MaterialCommunityIcons name="check-circle-outline" size={19} color="#16845D" />
              <Text style={styles.alreadyReviewedText}>You've submitted today's review for this bathroom.</Text>
            </View>
          ) : (
            <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
              <Text style={styles.formTitle}>Rate cleanliness</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setCleanliness(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: cleanliness === value }}
                    accessibilityLabel={`${value} out of 5 cleanliness`}
                    style={styles.starButton}
                  >
                    <MaterialCommunityIcons name={cleanliness && value <= cleanliness ? 'star' : 'star-outline'} size={30} color={cleanliness && value <= cleanliness ? '#E89A18' : '#C2CAD4'} />
                  </Pressable>
                ))}
                <Text style={styles.ratingHint}>{cleanliness ? `${cleanliness}/5` : 'Tap a star'}</Text>
              </View>
              <Text style={[styles.formTitle, styles.busynessHeading]}>Report busyness</Text>
              <View style={styles.busynessOptions}>
                {busynessOptions.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: busyness === option }}
                    onPress={() => setBusyness(option)}
                    style={[styles.busynessOption, busyness === option && styles.busynessSelected]}
                  >
                    <Text style={[styles.busynessOptionText, busyness === option && styles.busynessSelectedText]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.formNote}>Reports are anonymous and limited to one per bathroom each calendar day on this installation.</Text>
            </ScrollView>
          )}

          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
          {!bathroom.reviewedToday ? (
            <Pressable
              accessibilityRole="button"
              disabled={!cleanliness || !busyness || submitting}
              onPress={handleSubmit}
              style={[styles.submitButton, (!cleanliness || !busyness || submitting) && styles.submitDisabled]}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit review</Text>}
            </Pressable>
          ) : null}
          <Text style={styles.privacyNote}>No account needed. One review per installation per bathroom per LA calendar day; this limits repeats, but can't guarantee one review per person.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#14203355' },
  backdropTouch: { flex: 1 },
  sheet: { maxHeight: '91%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 15 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#DCE2EA', alignSelf: 'center', marginBottom: 17 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleGroup: { flex: 1, gap: 3 },
  kicker: { color: '#748094', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#17212F', fontSize: 23, fontWeight: '700', marginTop: 3 },
  building: { color: '#778294', fontSize: 14 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F6FA', alignItems: 'center', justifyContent: 'center' },
  demoLabel: { alignSelf: 'flex-start', color: '#8C5B0B', backgroundColor: '#FFF4D8', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, fontSize: 9, fontWeight: '800', letterSpacing: 0.35, marginTop: 12 },
  summaryRow: { flexDirection: 'row', marginTop: 18, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: '#F6F8FB', borderRadius: 14 },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  summaryValue: { color: '#1D2939', fontSize: 19, fontWeight: '700' },
  summaryCaption: { color: '#758094', fontSize: 11 },
  summaryDivider: { width: 1, backgroundColor: '#DFE4EB', marginHorizontal: 8 },
  busynessValue: { color: '#1D2939', fontSize: 16, fontWeight: '700', height: 25, textAlignVertical: 'center' },
  freshness: { color: '#738093', fontSize: 11, lineHeight: 16, marginTop: 10 },
  form: { flexGrow: 0, marginTop: 17 },
  formContent: { paddingBottom: 6 },
  formTitle: { color: '#253143', fontSize: 14, fontWeight: '700' },
  stars: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 3 },
  starButton: { padding: 2 },
  ratingHint: { marginLeft: 8, color: '#7A8493', fontSize: 12 },
  busynessHeading: { marginTop: 18 },
  busynessOptions: { flexDirection: 'row', gap: 9, marginTop: 8 },
  busynessOption: { flex: 1, borderWidth: 1, borderColor: '#DCE2EA', borderRadius: 11, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  busynessSelected: { backgroundColor: '#EBF2FF', borderColor: '#3478F6' },
  busynessOptionText: { color: '#566274', fontSize: 13, fontWeight: '600' },
  busynessSelectedText: { color: '#2866D3' },
  formNote: { color: '#7A8493', fontSize: 10, lineHeight: 15, marginTop: 12 },
  alreadyReviewed: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 11, marginTop: 15, borderRadius: 12, backgroundColor: '#EAF7F1' },
  alreadyReviewedText: { flex: 1, color: '#176B50', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  errorText: { color: '#B42318', fontSize: 12, marginTop: 8 },
  submitButton: { height: 48, borderRadius: 12, backgroundColor: '#3478F6', alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  submitDisabled: { backgroundColor: '#9CB9EC' },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  privacyNote: { color: '#8A94A3', textAlign: 'center', fontSize: 9, lineHeight: 13, marginTop: 9 },
});