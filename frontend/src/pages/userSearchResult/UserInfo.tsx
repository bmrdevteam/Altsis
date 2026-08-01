import defaultProfilePic from "assets/img/default_profile.png";
import style from "style/pages/userSearchResult/userInfo.module.scss";

type Props = {
  user: any;
};

const roleInKorean = new Map<string, string>();
roleInKorean.set("student", "학생");
roleInKorean.set("teacher", "교사");
roleInKorean.set("parents", "학부모");
roleInKorean.set("admin", "관리자");

const UserInfo = (props: Props) => {
  const { user } = props;

  if (!user) {
    return <div className={style.user_info} />;
  }

  return (
    <div className={style.user_info}>
      <div className={style.user_profile_img_container}>
        <img
          src={user.profile || defaultProfilePic}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = user.profile.replace("/thumb/", "/original/");
          }}
          alt=""
        />
      </div>
      <div className={style.user_text}>
        <div className={style.user_name_row}>
          <span className={style.user_name}>{user.userName}</span>
          {user.userId && (
            <span className={style.user_id}>{user.userId}</span>
          )}
        </div>
        <div className={style.user_meta}>
          {user.role === "student" ? (
            <>
              {user.schoolName && (
                <span className={style.user_school}>{user.schoolName}</span>
              )}
              {user.teacherName && (
                <span className={style.user_role}>
                  교사 {user.teacherName} 담당 학생
                </span>
              )}
            </>
          ) : (
            <>
              {user.schoolName && (
                <span className={style.user_school}>{user.schoolName}</span>
              )}
              <span className={style.user_role}>
                {roleInKorean.get(user.role)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
