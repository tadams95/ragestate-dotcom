import { fireEvent, render, screen } from '@testing-library/react';
import Post from '../Post';

jest.mock('@/app/utils/metrics', () => ({ track: jest.fn() }));

jest.mock('../../../firebase/context/FirebaseContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'u1' } }),
}));

jest.mock('../../../firebase/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  onSnapshot: jest.fn(() => () => {}),
}));

describe('Post', () => {
  it('opens comments when clicking comments button', () => {
    render(
      <Post
        postData={{
          id: 'p1',
          author: 'A',
          timestamp: 'now',
          content: 'c',
          likeCount: 0,
          commentCount: 0,
        }}
      />,
    );
    const btns = screen.getAllByRole('button');
    const commentsBtn = btns.find(
      (b) => /Comments/i.test(b.title) || /Comments/i.test(b.getAttribute('aria-label') || ''),
    );
    fireEvent.click(commentsBtn);
  });
});
