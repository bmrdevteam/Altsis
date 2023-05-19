/**
 * Copy and paste this to routes>enrollments.js
 */
import * as enrollments0 from "../controllers/enrollmentsV0.js";
import * as enrollments1 from "../controllers/enrollmentsV1.js";
import * as enrollments2 from "../controllers/enrollmentsV2.js";
import * as enrollments3 from "../controllers/enrollmentsV3.js";
import * as enrollments4 from "../controllers/enrollmentsV4.js";

router.post("/v0", isLoggedIn, enrollments0.enroll);
router.post("/v1", isLoggedIn, enrollments1.enroll);
router.post("/v2", isLoggedIn, enrollments2.enroll);
router.post("/v3", isLoggedIn, enrollments3.enroll);
router.post("/v4", isLoggedIn, enrollments4.enroll);
