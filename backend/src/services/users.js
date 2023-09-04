import { User } from "../models/index.js";

export class UserService {
  constructor(academyId) {
    this.academyId = academyId;
  }

  /**
   * @param {ObjectId} uid - user._id
   */
  findByUID = async (uid) => {
    const userRecord = await User(this.academyId).findById(uid);
    return { user: userRecord };
  };
}
