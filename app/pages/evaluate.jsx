import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { db, auth } from 'FirebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';

const StarQuestion = ({ question, value, onChange }) => (
  <View style={styles.questionBlock}>
    <Text style={styles.label}>{question}</Text>
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(num => (
        <TouchableOpacity key={num} onPress={() => onChange(num)}>
          <FontAwesome
            name={num <= value ? 'star' : 'star-o'}
            size={32}
            color="#f1c40f"
            style={styles.star}
          />
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export default function EvaluatePage() {
  const { booth } = useLocalSearchParams();
  const router = useRouter();
  const boothData = JSON.parse(booth);

  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [evaluationId, setEvaluationId] = useState(null); // for updating draft
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // Step 1: Get the question IDs from booth_questions
        const boothQuestionSnap = await getDocs(
          query(collection(db, 'booth_questions'), where('booth_id', '==', boothData.id))
        );

        if (boothQuestionSnap.empty) {
          console.warn('No questions linked to this booth.');
          return;
        }

        const boothQuestionDoc = boothQuestionSnap.docs[0];
        const questionIds = boothQuestionDoc.data().questions;

        // Step 2: Fetch each question using the IDs
        const questionPromises = questionIds.map(async (qid) => {
          const questionDoc = await getDocs(query(
            collection(db, 'questions'),
            where('__name__', '==', qid)
          ));
          if (!questionDoc.empty) {
            const qData = questionDoc.docs[0];
            return { id: qData.id, ...qData.data() };
          }
          return null;
        });

        const questionsList = (await Promise.all(questionPromises)).filter(q => q !== null);
        setQuestions(questionsList);

        // Step 3: Try to load draft
        const draftSnapshot = await getDocs(
          query(
            collection(db, 'evaluations'),
            where('boothId', '==', boothData.id),
            where('userId', '==', auth.currentUser.uid),
            where('status', '==', 'draft')
          )
        );
        if (!draftSnapshot.empty) {
          const draft = draftSnapshot.docs[0];
          setEvaluationId(draft.id);
          setResponses(draft.data().responses || {});
        }

      } catch (err) {
        console.error("Error fetching questions:", err);
      }
    };

    fetchQuestions();
  }, []);

  const handleResponseChange = (qid, value) => {
    setResponses(prev => ({ ...prev, [qid]: value }));
  };

  const validate = () => {
    const allFilled = questions.every(q => {
      if (q.type === 'star') return responses[q.id] > 0;
      if (q.type === 'feedback') return responses[q.id]?.trim().length > 0;
      return true;
    });
    return allFilled;
  };

  const saveEvaluation = async (final = false) => {
    if (final && !validate()) {
      Alert.alert("Incomplete", "Please answer all questions.");
      return;
    }

    const data = {
      boothId: boothData.id,
      userId: auth.currentUser.uid,
      responses,
      status: final ? 'submitted' : 'draft',
      createdAt: Timestamp.now(),
    };

    try {
      if (evaluationId) {
        await updateDoc(doc(db, 'evaluations', evaluationId), data);
      } else {
        const docRef = await addDoc(collection(db, 'evaluations'), data);
        setEvaluationId(docRef.id);
      }

      Alert.alert(final ? "Submitted" : "Saved", final ? "Thank you for your evaluation!" : "Draft saved.");
      if (final) router.back();
    } catch (err) {
      console.error("Error saving evaluation:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Evaluate {boothData.booth_name}</Text>

      {questions.map((q, index) => (
        <View key={q.id}>
          <Text>{index + 1}.</Text>
          {q.type === 'star' && (
            <StarQuestion
              question={q.question}
              value={responses[q.id] || 0}
              onChange={val => handleResponseChange(q.id, val)}
            />
          )}
          {q.type === 'feedback' && (
            <View style={styles.commentBlock}>
              <Text style={styles.label}>{q.question}</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Write your feedback here..."
                multiline
                numberOfLines={4}
                value={responses[q.id] || ''}
                onChangeText={text => handleResponseChange(q.id, text)}
              />
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.draftButton} onPress={() => saveEvaluation(false)}>
        <Text style={styles.submitButtonText}>Save as Draft</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitButton} onPress={() => saveEvaluation(true)}>
        <Text style={styles.submitButtonText}>Submit Evaluation</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  questionBlock: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  star: {
    marginHorizontal: 6,
  },
  commentBlock: {
    marginBottom: 30,
  },
  textArea: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    backgroundColor: '#f9f9f9',
  },
  draftButton: {
    backgroundColor: '#ccc',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#5d3fd3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
