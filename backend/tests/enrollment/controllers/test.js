router.get("/clean", async (req, res) => {
  try {
    await Enrollment("garisan").deleteMany({});
    await Syllabus("garisan").updateMany({}, { count: 0 });

    return res.status(200).send({ message: "done" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});
