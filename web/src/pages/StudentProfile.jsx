import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { getStudentProfile, updateStudentProfile, uploadProfilePicture } from '../api/students';
import { Button } from '../components/Button';
import { FriendActionButton } from '../components/FriendActionButton';
import '../components/Card.css';
import '../pages/Friends.css';
import './StudentProfile.css';

export function StudentProfile() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [showGroupsDraft, setShowGroupsDraft] = useState(true);
  const [showFriendsDraft, setShowFriendsDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getStudentProfile(documentId);
      setProfile(data);
      setBioDraft(data.bio || '');
      setShowGroupsDraft(data.showGroupsOnProfile ?? true);
      setShowFriendsDraft(data.showFriendsOnProfile ?? true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (loading) {
    return <p className="caption">{t.groupDetail.loading}</p>;
  }

  if (error || !profile) {
    return (
      <div>
        <p className="caption">
          <button type="button" className="link-button" onClick={() => navigate(-1)}>{t.studentProfile.back}</button>
        </p>
        <h1>{t.studentProfile.notFound}</h1>
        {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}
      </div>
    );
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadProfilePicture(file);
      await updateStudentProfile(documentId, { profilePicture: uploaded.id });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateStudentProfile(documentId, {
        bio: bioDraft,
        showGroupsOnProfile: showGroupsDraft,
        showFriendsOnProfile: showFriendsDraft,
      });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const photoUrl = profile.profilePicture?.url ? `${API_URL}${profile.profilePicture.url}` : null;

  const groupMap = new Map();
  (profile.groups || []).forEach((g) => groupMap.set(g.documentId, { ...g, isManager: false }));
  (profile.managedGroups || []).forEach((g) => {
    const existing = groupMap.get(g.documentId);
    groupMap.set(g.documentId, { ...(existing || g), isManager: true });
  });
  const groupsList = [...groupMap.values()];
  const groupsVisible = profile.groups !== undefined || profile.managedGroups !== undefined;
  const friendsVisible = profile.friends !== undefined;

  return (
    <div>
      <p className="caption">
        <button type="button" className="link-button" onClick={() => navigate(-1)}>{t.studentProfile.back}</button>
      </p>

      <div className="student-profile__header">
        <div className="student-profile__identity">
          <div className="student-profile__photo">
            {photoUrl ? <img src={photoUrl} alt={profile.name} /> : <div className="student-profile__photo-placeholder" />}
          </div>
          <div>
            <h1>{profile.name}</h1>
            {profile.program && <div className="caption" style={{ marginTop: '0.25rem' }}>{profile.program}</div>}
          </div>
        </div>

        {profile.isOwner ? (
          <Button variant={editing ? 'outline' : 'primary'} onClick={() => setEditing((v) => !v)}>
            {editing ? t.studentProfile.cancel : t.studentProfile.edit}
          </Button>
        ) : (
          <FriendActionButton targetDocumentId={documentId} status={profile.friendStatus} onChange={load} onError={setError} />
        )}
      </div>

      {error && <p className="caption" style={{ color: 'var(--status-rejected)' }}>{error}</p>}

      {editing ? (
        <section className="student-profile__edit">
          <label className="caption" htmlFor="profile-photo">{t.studentProfile.profilePicture}</label>
          <input id="profile-photo" type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} />

          <label className="caption" htmlFor="profile-bio">{t.studentProfile.bio}</label>
          <textarea id="profile-bio" rows={4} value={bioDraft} onChange={(e) => setBioDraft(e.target.value)} />

          <label className="student-profile__checkbox caption">
            <input
              type="checkbox"
              checked={showGroupsDraft}
              onChange={(e) => setShowGroupsDraft(e.target.checked)}
            />
            {t.studentProfile.showGroups}
          </label>

          <label className="student-profile__checkbox caption">
            <input
              type="checkbox"
              checked={showFriendsDraft}
              onChange={(e) => setShowFriendsDraft(e.target.checked)}
            />
            {t.studentProfile.showFriends}
          </label>

          <Button disabled={saving} onClick={handleSave}>
            {saving ? t.studentProfile.saving : t.studentProfile.save}
          </Button>
        </section>
      ) : (
        <p style={{ marginTop: '1.5rem' }}>{profile.bio}</p>
      )}

      {groupsVisible && (
        <section style={{ marginTop: '3rem' }}>
          <h2>{t.studentProfile.groupsHeader}</h2>
          {groupsList.length === 0 && <p className="caption">{t.studentProfile.noGroups}</p>}
          <div className="card-grid">
            {groupsList.map((group) => (
              <Link to={`/groups/${group.documentId}`} className="card card__link" key={group.documentId}>
                <div className="card__title">{group.name}</div>
                {group.isManager && <div className="caption">{t.studentProfile.manager}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {friendsVisible && (
        <section style={{ marginTop: '3rem' }}>
          <h2>{t.studentProfile.friendsHeader}</h2>
          {profile.friends.length === 0 && <p className="caption">{t.studentProfile.noFriends}</p>}
          {profile.friends.map((friend) => (
            <Link to={`/students/${friend.documentId}`} className="friends-row" key={friend.documentId}>
              <span>{friend.name}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
