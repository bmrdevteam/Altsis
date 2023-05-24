import { logger } from "../log/logger.js";
import _ from "lodash";
import { User } from "../models/User.js";
//

export const findMyself = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findById(req.user._id);
    return res.status(200).send({
      user,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
