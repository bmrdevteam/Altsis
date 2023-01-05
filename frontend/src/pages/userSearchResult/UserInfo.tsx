import defaultProfilePic from "assets/img/default_profile.png";
import style from "style/pages/userSearchResult/userInfo.module.scss";

type Props = {
	user: any
}

const UserInfo = (props: Props) => {
	const { user } = props;

  if (!user) {
    return <div className={style.user_info}></div>
  }
  
	return <div className={style.user_info}>
		<div className={style.user_profile_img_container}>
			<img 
				src={user?.profile || defaultProfilePic}
        onError={(e) => {
					e.currentTarget.onerror = null;
					e.currentTarget.src = user?.profile.replace(
					"/thumb/",
					"/original/"
					);
				}}
        alt="profile"
			/>
		</div>
    <div>
      <span className={style.user_school}>{user.schools[0].schoolName + ' '}</span>
      <span className={style.user_auth}>{user.auth}</span>
    </div>
    <div className={style.user_name}>{user.userName + '님의 정보'}</div>
	</div>
}

export default UserInfo;