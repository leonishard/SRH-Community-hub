import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getGroup,
  joinGroup,
  leaveGroup,
  updateGroup,
  deleteGroup,
  uploadGroupCoverImage,
  uploadGroupProfilePicture,
} from '../api/groups';
import { listEvents, submitEvent, uploadEventPoster } from '../api/events';
import { listPosts, createPost, uploadPostMedia } from '../api/posts';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import { PostThread } from '../components/PostThread';
import '../components/Card.css';
import './Friends.css';
import './GroupDetail.css';

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function GroupDetail() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, student, roleType, refreshStudent } = useAuth();
  const { t } = useLanguage();
  const [group, setGroup] = useState(null);
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [membershipPending, setMembershipPending] = useState(false);

  const [showPostForm, setShowPostForm] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState([]);
  const [submittingPost, setSubmittingPost] = useState(false);

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventPoster, setEventPoster] = useState(null);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [eventNotice, setEventNotice] = useState(null);

  const [editingGroup, setEditingGroup] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [groupData, groupEvents, groupPosts] = await Promise.all([
        getGroup(documentId),
        listEvents({ 'filters[group][documentId][$eq]': documentId, 'sort[0]': 'date:asc' }),
        listPosts({ 'filters[group][documentId][$eq]': documentId }),
      ]);
      setGroup(groupData);
      setNameDraft(groupData.name || '');
      setDescriptionDraft(groupData.description || '');
      setCategoryDraft(groupData.category || '');
      setEvents(groupEvents);
      setPosts(groupPosts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setEditingGroup(false);
    setConfirmingDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (loading) {
    return <p className="caption">{t.groupDetail.loading}</p>;
  }

  if (error || !group) {
    return (
      <div>
        <h1>{t.groupDetail.notFound}</h1>
        {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}
        <p className="caption" style={{ marginTop: '0.5rem' }}>
          <Link to="/groups">{t.groupDetail.backToGroups}</Link>
        </p>
      </div>
    );
  }

  const isMember = (student?.groups || []).some((g) => g.documentId === documentId);
  const isManager = (student?.managedGroups || []).some((g) => g.documentId === documentId);
  const isCoordinator = roleType === 'coordinator';
  const canManageGroup = isManager || isCoordinator;

  const now = new Date();
  const approved = events.filter((e) => e.status === 'approved');
  const upcoming = approved.filter((e) => new Date(e.date) >= now);
  const past = approved.filter((e) => new Date(e.date) < now);
  const pending = events.filter((e) => e.status === 'pending');

  const coverUrl = group.coverImage?.url ? `${API_URL}${group.coverImage.url}` : null;
  const profilePictureUrl = group.profilePicture?.url ? `${API_URL}${group.profilePicture.url}` : null;

  async function handleToggleMembership() {
    setMembershipPending(true);
    try {
      if (isMember) {
        await leaveGroup(documentId);
      } else {
        await joinGroup(documentId);
      }
      const [groupData] = await Promise.all([getGroup(documentId), refreshStudent()]);
      setGroup(groupData);
    } catch (err) {
      setError(err.message);
    } finally {
      setMembershipPending(false);
    }
  }

  async function handleSubmitEvent(e) {
    e.preventDefault();
    setSubmittingEvent(true);
    setEventNotice(null);
    try {
      const uploadedPoster = eventPoster ? await uploadEventPoster(eventPoster) : null;
      await submitEvent({
        title: eventTitle,
        description: eventDescription,
        date: new Date(eventDate).toISOString(),
        location: eventLocation,
        category: eventCategory,
        group: documentId,
        poster: uploadedPoster?.id,
      });
      setEventTitle('');
      setEventDescription('');
      setEventDate('');
      setEventLocation('');
      setEventCategory('');
      setEventPoster(null);
      setEventNotice(t.groupDetail.eventSubmitted);
      setShowEventForm(false);
      const groupEvents = await listEvents({
        'filters[group][documentId][$eq]': documentId,
        'sort[0]': 'date:asc',
      });
      setEvents(groupEvents);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingEvent(false);
    }
  }

  async function handleSubmitPost(e) {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    setSubmittingPost(true);
    try {
      const mediaIds = newPostMedia.length > 0 ? await uploadPostMedia(newPostMedia) : [];
      await createPost(documentId, newPostContent, mediaIds);
      setNewPostContent('');
      setNewPostMedia([]);
      setShowPostForm(false);
      const groupPosts = await listPosts({ 'filters[group][documentId][$eq]': documentId });
      setPosts(groupPosts);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingPost(false);
    }
  }

  async function handleCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const uploaded = await uploadGroupCoverImage(file);
      await updateGroup(documentId, { coverImage: uploaded.id });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleProfilePictureChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProfilePicture(true);
    try {
      const uploaded = await uploadGroupProfilePicture(file);
      await updateGroup(documentId, { profilePicture: uploaded.id });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingProfilePicture(false);
    }
  }

  async function handleDeleteGroup() {
    setDeleting(true);
    try {
      await deleteGroup(documentId);
      navigate('/groups', { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  async function handleSaveGroup() {
    setSavingGroup(true);
    try {
      await updateGroup(documentId, {
        name: nameDraft,
        description: descriptionDraft,
        category: categoryDraft,
      });
      setEditingGroup(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingGroup(false);
    }
  }

  return (
    <div>
      <p className="caption">
        <Link to="/groups">{t.groupDetail.backToGroups}</Link>
      </p>

      <div className="group-detail__cover">
        {coverUrl ? <img src={coverUrl} alt="" /> : <div className="group-detail__cover-placeholder" />}
      </div>

      <div className="group-detail__header">
        <div className="group-detail__identity">
          <div className="group-detail__avatar">
            {profilePictureUrl ? (
              <img src={profilePictureUrl} alt="" />
            ) : (
              <div className="group-detail__avatar-placeholder" />
            )}
          </div>
          <div>
            <h1>{group.name}</h1>
            <div className="card__meta caption" style={{ marginTop: '0.5rem' }}>
              {group.category}
              {group.members ? t.card.member(group.members.length) : ''}
            </div>
            {group.manager && (
              <div className="caption" style={{ marginTop: '0.25rem' }}>
                {t.groupDetail.managedBy} <Link to={`/students/${group.manager.documentId}`}>{group.manager.name}</Link>
              </div>
            )}
          </div>
        </div>
        <div className="group-detail__header-actions">
          {canManageGroup && (
            <Button variant={editingGroup ? 'outline' : 'primary'} onClick={() => setEditingGroup((v) => !v)}>
              {editingGroup ? t.groupDetail.cancel : t.groupDetail.editGroup}
            </Button>
          )}
          {canManageGroup && (
            <Button onClick={() => setShowPostForm((v) => !v)}>
              {showPostForm ? t.groupDetail.cancel : t.groupDetail.newPost}
            </Button>
          )}
          {canManageGroup && (
            <Button onClick={() => setShowEventForm((v) => !v)}>
              {showEventForm ? t.groupDetail.cancel : t.groupDetail.newEvent}
            </Button>
          )}
          {isAuthenticated && (
            <Button variant={isMember ? 'outline' : 'primary'} disabled={membershipPending} onClick={handleToggleMembership}>
              {isMember ? t.groupDetail.leave : t.groupDetail.join}
            </Button>
          )}
          {isCoordinator && !confirmingDelete && (
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              {t.groupDetail.deleteGroup}
            </Button>
          )}
          {isCoordinator && confirmingDelete && (
            <>
              <Button variant="outline" disabled={deleting} onClick={() => setConfirmingDelete(false)}>
                {t.groupDetail.cancel}
              </Button>
              <Button variant="danger" disabled={deleting} onClick={handleDeleteGroup}>
                {deleting ? t.groupDetail.deleting : t.groupDetail.confirmDelete}
              </Button>
            </>
          )}
        </div>
      </div>

      {confirmingDelete && (
        <p className="caption" style={{ color: 'var(--status-rejected)', marginTop: '0.75rem' }}>
          {t.groupDetail.deleteWarning(
            group.name,
            group.members?.length ? t.groupDetail.memberClause(group.members.length) : ''
          )}
        </p>
      )}

      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      <div className="group-detail__body">
        <div className="group-detail__main">
          {editingGroup ? (
            <section className="group-detail__form">
              <label className="caption" htmlFor="group-profile-picture">{t.groupDetail.profilePicture}</label>
              <input
                id="group-profile-picture"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                disabled={uploadingProfilePicture}
              />

              <label className="caption" htmlFor="group-cover">{t.groupDetail.coverImage}</label>
              <input id="group-cover" type="file" accept="image/*" onChange={handleCoverChange} disabled={uploadingCover} />

              <label className="caption" htmlFor="group-name">{t.groupDetail.name}</label>
              <input id="group-name" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} required />

              <label className="caption" htmlFor="group-category">{t.groupDetail.category}</label>
              <input id="group-category" value={categoryDraft} onChange={(e) => setCategoryDraft(e.target.value)} />

              <label className="caption" htmlFor="group-description">{t.groupDetail.description}</label>
              <textarea
                id="group-description"
                rows={4}
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
              />

              <Button disabled={savingGroup} onClick={handleSaveGroup}>
                {savingGroup ? t.groupDetail.saving : t.groupDetail.save}
              </Button>
            </section>
          ) : (
            <p style={{ marginTop: '1.5rem' }}>{group.description}</p>
          )}

          {canManageGroup && showPostForm && (
            <form className="group-detail__form" onSubmit={handleSubmitPost} style={{ marginTop: '1.5rem' }}>
              <label className="caption" htmlFor="post-content">{t.groupDetail.newPostLabel}</label>
              <textarea
                id="post-content"
                rows={3}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={t.groupDetail.postPlaceholder}
                required
              />
              <label className="caption" htmlFor="post-media">{t.groupDetail.mediaLabel}</label>
              <input
                id="post-media"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setNewPostMedia(Array.from(e.target.files || []))}
              />
              {newPostMedia.length > 0 && (
                <p className="caption" style={{ marginTop: '0.25rem' }}>
                  {t.groupDetail.filesSelected(newPostMedia.length)}
                </p>
              )}
              <Button type="submit" disabled={submittingPost || !newPostContent.trim()}>
                {submittingPost ? t.groupDetail.posting : t.groupDetail.post}
              </Button>
            </form>
          )}

          <section style={{ marginTop: '2rem' }}>
            <h2>{t.groupDetail.postsHeader}</h2>
            {posts.length === 0 && <p className="caption" style={{ marginTop: '0.5rem' }}>{t.groupDetail.noPosts}</p>}
            {posts.length > 0 && (
              <div className="group-detail__posts">
                {posts.map((post) => (
                  <PostThread
                    key={post.documentId}
                    post={post}
                    isMember={isMember}
                    canModerate={canManageGroup}
                    currentStudentDocumentId={student?.documentId}
                  />
                ))}
              </div>
            )}
          </section>

          {canManageGroup && showEventForm && (
            <section style={{ marginTop: '3rem' }}>
              <h2>{t.groupDetail.submitEventHeader}</h2>
              <form onSubmit={handleSubmitEvent} className="group-detail__form">
                <label className="caption" htmlFor="event-title">{t.groupDetail.eventTitle}</label>
                <input id="event-title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />

                <label className="caption" htmlFor="event-description">{t.groupDetail.eventDescription}</label>
                <textarea
                  id="event-description"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows={3}
                />

                <label className="caption" htmlFor="event-date">{t.groupDetail.eventDateTime}</label>
                <input
                  id="event-date"
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />

                <label className="caption" htmlFor="event-location">{t.groupDetail.eventLocation}</label>
                <input id="event-location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />

                <label className="caption" htmlFor="event-category">{t.groupDetail.eventCategory}</label>
                <input
                  id="event-category"
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value)}
                  placeholder={t.groupDetail.eventCategoryPlaceholder}
                />

                <label className="caption" htmlFor="event-poster">{t.groupDetail.eventPoster}</label>
                <input
                  id="event-poster"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEventPoster(e.target.files?.[0] || null)}
                />

                <Button type="submit" disabled={submittingEvent}>
                  {submittingEvent ? t.groupDetail.submitting : t.groupDetail.submitEvent}
                </Button>
              </form>
            </section>
          )}
          {eventNotice && <p className="caption" style={{ marginTop: '1rem' }}>{eventNotice}</p>}

          {canManageGroup && pending.length > 0 && (
            <div style={{ marginTop: '3rem' }}>
              <h2 className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ash-fg)', letterSpacing: '0.06em' }}>
                {t.groupDetail.awaitingApproval}
              </h2>
              <div className="card-grid">
                {pending.map((event) => {
                  const posterUrl = event.poster?.url ? `${API_URL}${event.poster.url}` : null;
                  return (
                    <Link to={`/events/${event.documentId}`} className="card card__link" key={event.documentId}>
                      {posterUrl ? (
                        <img className="card__poster" src={posterUrl} alt="" />
                      ) : (
                        <div className="card__poster card__poster--placeholder" />
                      )}
                      <div className="card__meta">
                        <StatusTag status={event.status} />
                      </div>
                      <div className="card__title">{event.title}</div>
                      <div className="caption">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <section style={{ marginTop: '3rem' }}>
            <h2>{t.groupDetail.upcomingEventsHeader}</h2>
            {upcoming.length === 0 && <p className="caption">{t.groupDetail.noUpcoming}</p>}
            <div className="card-grid">
              {upcoming.map((event) => {
                const posterUrl = event.poster?.url ? `${API_URL}${event.poster.url}` : null;
                return (
                  <Link to={`/events/${event.documentId}`} className="card card__link" key={event.documentId}>
                    {posterUrl ? (
                      <img className="card__poster" src={posterUrl} alt="" />
                    ) : (
                      <div className="card__poster card__poster--placeholder" />
                    )}
                    <div className="card__title">{event.title}</div>
                    <div className="card__description">{event.description}</div>
                    <div className="caption">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section style={{ marginTop: '3rem' }}>
            <h2>{t.groupDetail.pastEventsHeader}</h2>
            {past.length === 0 && <p className="caption">{t.groupDetail.noPast}</p>}
            <div className="card-grid">
              {past.map((event) => {
                const posterUrl = event.poster?.url ? `${API_URL}${event.poster.url}` : null;
                return (
                  <Link to={`/events/${event.documentId}`} className="card card__link" key={event.documentId}>
                    {posterUrl ? (
                      <img className="card__poster" src={posterUrl} alt="" />
                    ) : (
                      <div className="card__poster card__poster--placeholder" />
                    )}
                    <div className="card__title">{event.title}</div>
                    <div className="card__description">{event.description}</div>
                    <div className="caption">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {group.members && group.members.length > 0 && (
          <aside className="group-detail__sidebar">
            <h2 className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ash-fg)', letterSpacing: '0.06em' }}>
              {t.groupDetail.membersHeader(group.members.length)}
            </h2>
            {group.members.map((member) => (
              <Link to={`/students/${member.documentId}`} className="friends-row" key={member.documentId}>
                <span>{member.name}</span>
              </Link>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
