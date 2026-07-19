import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { listComments, createComment, deleteComment } from '../api/comments';
import { Button } from './Button';
import '../components/Card.css';
import './PostThread.css';

function formatTimestamp(iso) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

function CommentRow({ comment, canDelete, onDeleted, setError, t }) {
  const [deleting, setDeleting] = useState(false);
  const photoUrl = comment.author?.profilePicture?.url ? `${API_URL}${comment.author.profilePicture.url}` : null;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteComment(comment.documentId);
      onDeleted(comment.documentId);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="comment-row">
      <div className="comment-row__avatar">
        {photoUrl ? <img src={photoUrl} alt="" /> : <div className="comment-row__avatar-placeholder" />}
      </div>
      <div className="comment-row__body">
        <div className="comment-row__meta">
          {comment.author ? (
            <Link to={`/students/${comment.author.documentId}`} className="comment-row__author">
              {comment.author.name}
            </Link>
          ) : (
            <span className="comment-row__author">{t.post.someone}</span>
          )}
          <span className="comment-row__time mono caption">{formatTimestamp(comment.createdAt)}</span>
          {canDelete && (
            <button type="button" className="link-button caption" disabled={deleting} onClick={handleDelete}>
              {deleting ? t.post.removing : t.post.delete}
            </button>
          )}
        </div>
        <div className="comment-row__text">{comment.content}</div>
      </div>
    </div>
  );
}

export function PostThread({ post, isMember, canModerate, currentStudentDocumentId }) {
  const { t } = useLanguage();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listComments(post.documentId)
      .then(setComments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.documentId]);

  function handleDeleted(documentId) {
    setComments((prev) => prev.filter((c) => c.documentId !== documentId));
  }

  async function handleSubmitComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await createComment(post.documentId, newComment);
      setNewComment('');
      const refreshed = await listComments(post.documentId);
      setComments(refreshed);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card post">
      <div className="post__meta caption">
        {post.author && <Link to={`/students/${post.author.documentId}`}>{post.author.name}</Link>}
        <span className="mono">{formatTimestamp(post.createdAt)}</span>
      </div>
      <div className="post__content">{post.content}</div>

      {post.media && post.media.length > 0 && (
        <div className="post__media">
          {post.media.map((file) => {
            const url = `${API_URL}${file.url}`;
            const isVideo = file.mime?.startsWith('video/');
            return isVideo ? (
              <video key={file.id} className="post__media-item" src={url} controls />
            ) : (
              <img key={file.id} className="post__media-item" src={url} alt="" />
            );
          })}
        </div>
      )}

      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {!loading && comments.length > 0 && (
        <div className="post__comments">
          {comments.map((comment) => (
            <CommentRow
              key={comment.documentId}
              comment={comment}
              canDelete={canModerate || (Boolean(currentStudentDocumentId) && comment.author?.documentId === currentStudentDocumentId)}
              onDeleted={handleDeleted}
              setError={setError}
              t={t}
            />
          ))}
        </div>
      )}

      {isMember ? (
        <form className="post__comment-form" onSubmit={handleSubmitComment}>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t.post.writeComment}
            disabled={submitting}
          />
          <Button type="submit" variant="outline" disabled={submitting || !newComment.trim()}>
            {submitting ? '…' : t.post.post}
          </Button>
        </form>
      ) : (
        <p className="caption post__join-prompt">{t.post.joinToComment}</p>
      )}
    </div>
  );
}
