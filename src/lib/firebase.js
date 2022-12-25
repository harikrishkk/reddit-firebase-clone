import { transition } from 'components/shared/helpers';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  orderBy,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore/lite';
import { useEffect } from 'react';
import useStore from 'store';
import shallow from 'zustand/shallow';
import { getPostScore, getUpvotePercentage } from './helpers';

const firebaseConfig = {
  apiKey: 'AIzaSyBY1F_1LiHjqLYUHfiyvnYFS8TSHEqLxkM',
  authDomain: 'redditclone-7e233.firebaseapp.com',
  projectId: 'redditclone-7e233',
  storageBucket: 'redditclone-7e233.appspot.com',
  messagingSenderId: '51283333580',
  appId: '1:51283333580:web:df54a86868904da221cd69',
  measurementId: 'G-DMCG0CHLK9',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// get the app
const auth = getAuth(app);

// get the firebase database
const db = getFirestore(app);
export const getTimestamp = serverTimestamp;

export async function loginUser({ email, password }) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signupUser({ username, email, password }) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  await createUser({
    user: userCred.user,
    username,
  });
}

export function useAuthUser() {
  const [setUser, resetUser] = useStore(
    (s) => [s.setUser, s.resetUser],
    shallow
  );
  useEffect(() => {
    async function getUser(user) {
      if (!user) {
        resetUser();
      } else {
        // get user by uid
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUser(userDoc.data());
        } else {
          resetUser();
        }
      }
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      getUser(user);
    });
    return () => {
      unsubscribe();
    };
  }, [setUser, resetUser]);
}

export async function checkIfUsernameTaken(username) {
  const col = collection(db, 'users');
  const q = query(col, where('username', '==', username));
  const { empty } = await getDocs(q);
  return empty || 'username taken';
}

export async function logOut() {
  return await signOut(auth);
}

export async function createUser({ user, username }) {
  const userDoc = doc(db, 'users', user.uid);
  await setDoc(userDoc, {
    uid: user.uid,
    username,
    email: user.email,
  });
}

export async function createPost(post) {
  const postsCollection = collection(db, 'posts');
  const { id } = await addDoc(postsCollection, post);
  const postDoc = doc(db, 'posts', id);
  const newPost = await getDoc(postDoc);
  return { id, ...newPost.data() };
}

export async function getDocuments(ref) {
  const snap = await getDocs(ref);
  const docs = snap.docs.map((doc) => ({
    id: doc.id,
    reference: doc.ref,
    ...doc.data(),
  }));
  return docs;
}

export async function getPost(postId) {
  const postRef = doc(db, 'posts', postId);
  const postDoc = await getDoc(postRef);
  return postDoc.exists() ? { id: postDoc.id, ...postDoc.data() } : null;
}

export async function getPosts() {
  const col = collection(db, 'posts');
  const q = query(col, orderBy('score', 'desc'));
  const posts = await getDocuments(q);
  return posts;
}

export async function getPostsByUsername(username) {
  const col = collection(db, 'posts');
  const q = query(col, where('author.username', '==', username));
  const post = await getDocuments(q);
  return post;
}

export async function getPostsByCategory(category) {
  const col = collection(db, 'posts');
  const q = query(
    col,
    where('category', '==', category),
    orderBy('score', 'desc')
  );
  const post = await getDocuments(q);
  return post;
}

export async function deletePost(postId) {
  const docRef = doc(db, 'posts', postId);
  const deletedPost = await deleteDoc(docRef);
  return deletedPost;
}

export async function createComment(comment) {
  const col = collection(db, 'posts', comment.postId, 'comments');
  const newComment = await addDoc(col, comment);
  return newComment;
}

export async function getCommentsByPostId(postId) {
  const col = collection(db, 'posts', postId, 'comments');
  const q = query(col, orderBy('created', 'desc'));
  const comments = await getDocuments(q);
  return comments;
}

export async function deleteComment({ postId, commentId }) {
  const docRef = doc(db, 'posts', postId, 'comments', commentId);
  const deletedDoc = await deleteDoc(docRef);
  return deletedDoc;
}

export async function addView(postId) {
  const postRef = doc(db, 'posts', postId);
  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (postDoc.exists()) {
      const newViewCount = postDoc.data().views + 1;
      transaction.update(postRef, {
        views: newViewCount,
      });
    }
  });
}

export async function getCommentCount(postId) {
  const col = collection(db, 'posts', postId, 'comments');
  const { size } = await getDocs(col);
  return size;
}

export async function toggleVote(vote) {
  const { postId, userId, value } = vote;
  const postRef = doc(db, 'posts', postId);
  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef);
    if (postDoc.exists()) {
      const votes = { ...postDoc.data().votes };
      const isUnvote = votes[userId] === value;
      if (isUnvote) {
        delete votes[userId];
      } else {
        votes[userId] = value;
      }
      const upvotePercentage = getUpvotePercentage(votes);
      const score = getPostScore(votes);
      transaction.update(postRef, { votes, score, upvotePercentage });
    }
  });
}
