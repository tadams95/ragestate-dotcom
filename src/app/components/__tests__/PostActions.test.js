import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PostActions from '../PostActions';

jest.mock('@/app/utils/metrics', () => ({ track: jest.fn() }));

jest.mock('../../../firebase/context/FirebaseContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'u1' } }),
}));

jest.mock('../../../firebase/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => new Date()),
}));

describe('PostActions', () => {
  it('renders and toggles like', async () => {
    render(<PostActions postId="p1" likeCount={0} commentCount={0} onOpenComments={() => {}} />);
    const likeBtn = await screen.findByRole('button', { name: /Like|Unlike/i });
    fireEvent.click(likeBtn);
    await waitFor(() => expect(likeBtn).toBeEnabled());
  });
});
