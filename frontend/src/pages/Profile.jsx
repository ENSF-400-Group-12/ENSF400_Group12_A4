// Profile page for ClosetAI

function Profile() {

  return (

    <div className="profile-page">

      <div className="profile-card">

        <h1>Profile</h1>

        <p className="profile-subtext">
          Manage your ClosetAI account information.
        </p>

        <div className="profile-info">

          <div className="profile-row">
            <span className="profile-label">Name</span>
            <span className="profile-value">User</span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Email</span>
            <span className="profile-value">user@email.com</span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Wardrobe Items</span>
            <span className="profile-value">0</span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Saved Outfits</span>
            <span className="profile-value">0</span>
          </div>

        </div>

      </div>

    </div>

  );

}

export default Profile;