import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import ScreenShell from '../../src/shared/components/ScreenShell';
import InfoCard from '../../src/shared/components/InfoCard';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { uploadFile, getCloudinaryAttachmentUrl, getCloudinaryPreviewUrl, toCloudinaryAsset } from '../../services/cloudinary';

export default function TutorialDetailsPage() {
  const { tutorialId } = useLocalSearchParams();
  const { user } = useAuth();
  const [tutorial, setTutorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [proof, setProof] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'tutorials', tutorialId));
      setTutorial(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    };
    load();
  }, [tutorialId]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const q = query(
      collection(db, 'purchases'),
      where('userId', '==', user.uid),
      where('tutorialId', '==', tutorialId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      let approved = false;
      let pendingPurchase = false;
      snapshot.forEach((item) => {
        const data = item.data();
        if (data.status === 'approved') approved = true;
        if (data.status === 'pending') pendingPurchase = true;
      });
      setHasAccess(approved);
      setPending(pendingPurchase);
    });

    return unsub;
  }, [tutorialId, user?.uid]);

  const sections = useMemo(() => {
    if (!tutorial) return [];
    return [
      { title: 'Category', text: tutorial.category || 'General' },
      { title: 'Tutor', text: tutorial.tutorName || 'Unknown tutor' },
      { title: 'Description', text: tutorial.description || 'No description available.' },
      { title: 'Price', text: `₦${Number(tutorial.price || 0).toLocaleString()}` },
    ];
  }, [tutorial]);

  const pickProof = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setProof(result.assets[0]);
  };

  const submitProof = async () => {
    if (!user?.uid || !proof) return;

    setUploading(true);
    try {
      const uploaded = await uploadFile({
        uri: proof.uri,
        name: proof.name || 'payment-proof.jpg',
        size: proof.size || 0,
        type: proof.mimeType || 'image/jpeg',
      });

        await addDoc(collection(db, 'purchases'), {
          userId: user.uid,
          tutorialId: tutorial.id,
          tutorId: tutorial.tutorId || '',
          tutorialTitle: tutorial.title || '',
          amount: Number(tutorial.price || 0),
          platformFee: Number(tutorial.price || 0) * 0.2,
          creatorShare: Number(tutorial.price || 0) * 0.8,
          platformFeeRate: 0.2,
          tutorialPrice: Number(tutorial.price || 0),
          proofUrl: uploaded.secure_url || uploaded.url || '',
          proofAsset: toCloudinaryAsset(uploaded),
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      setPending(true);
    } finally {
      setUploading(false);
    }
  };

  const openUrl = async (url) => {
    if (!url) return;
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  };

  if (loading) {
    return (
      <ScreenShell title="Tutorial" subtitle="Loading..." showBack>
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#4F46E5" />
          <Text style={styles.loadingText}>Loading tutorial...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (!tutorial) {
    return (
      <ScreenShell title="Tutorial" subtitle="Not found" showBack>
        <InfoCard title="Tutorial not found" text="This tutorial is not available yet." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={tutorial.title || 'Tutorial'} subtitle={tutorial.category || 'Premium tutorial'} showBack>
      <View style={styles.hero}>
        {tutorial.thumbnailUrl ? <Image source={{ uri: getCloudinaryPreviewUrl(tutorial.thumbnailUrl) }} style={styles.heroImage} /> : null}
        <View style={styles.heroBody}>
          <Text style={styles.title}>{tutorial.title}</Text>
          <Text style={styles.subtitle}>{tutorial.tutorName || 'Tutor'}</Text>
          <Text style={styles.price}>₦{Number(tutorial.price || 0).toLocaleString()}</Text>
        </View>
      </View>

      {hasAccess ? (
        <View style={styles.accessBox}>
          <Text style={styles.accessTitle}>Access granted</Text>
          <Text style={styles.accessText}>You can open the preview and attached PDF exactly like the website flow.</Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.primaryButton} onPress={() => openUrl(tutorial.videoUrl || tutorial.thumbnailUrl)}>
              <Text style={styles.primaryText}>Open Preview</Text>
            </Pressable>
            {tutorial.pdfUrl ? (
              <Pressable style={styles.secondaryButton} onPress={() => openUrl(getCloudinaryAttachmentUrl(tutorial.pdfUrl, `${tutorial.title}.pdf`))}>
                <Text style={styles.secondaryText}>Download PDF</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.lockBox}>
          <Text style={styles.lockTitle}>Free preview only</Text>
          <Text style={styles.lockText}>Upload a payment proof to unlock the full tutorial and PDF notes.</Text>
          {pending ? <Text style={styles.pending}>Payment pending approval.</Text> : null}
          <View style={styles.buttonRow}>
            <Pressable style={styles.primaryButton} onPress={() => openUrl(tutorial.videoUrl || tutorial.thumbnailUrl)}>
              <Text style={styles.primaryText}>Open Preview</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={pickProof}>
              <Text style={styles.secondaryText}>{proof ? proof.name : 'Pick Proof'}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.submitButton} onPress={submitProof} disabled={uploading || !proof}>
            {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Submit Payment Proof</Text>}
          </Pressable>
        </View>
      )}

      {sections.map((section) => (
        <InfoCard key={section.title} title={section.title} text={section.text} />
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
  },
  heroImage: {
    height: 220,
    width: '100%',
  },
  heroBody: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
  },
  price: {
    marginTop: 10,
    color: '#4F46E5',
    fontSize: 24,
    fontWeight: '900',
  },
  accessBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  accessTitle: {
    color: '#047857',
    fontSize: 16,
    fontWeight: '800',
  },
  accessText: {
    marginTop: 6,
    color: '#065F46',
    fontSize: 13,
    lineHeight: 19,
  },
  lockBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  lockTitle: {
    color: '#4338CA',
    fontSize: 16,
    fontWeight: '800',
  },
  lockText: {
    marginTop: 6,
    color: '#3730A3',
    fontSize: 13,
    lineHeight: 19,
  },
  pending: {
    marginTop: 8,
    color: '#A16207',
    fontSize: 12,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#4338CA',
    fontWeight: '800',
  },
  submitButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
