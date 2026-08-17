import { useEffect, useState } from "react";
import useAPIv2 from "hooks/useAPIv2";
import {
  getArchiveIdFromDbData,
  parseArchiveImageLocation,
  TArchiveFileValue,
} from "../../functions/archiveImage";

type Props = {
  file: TArchiveFileValue;
  location: string;
  dbData?: any;
};

const ArchiveImage = ({ file, location, dbData }: Props) => {
  const { FileAPI } = useAPIv2();
  const [url, setUrl] = useState("");
  const parsed = parseArchiveImageLocation(location);
  const archiveId = parsed
    ? getArchiveIdFromDbData(dbData, parsed.schoolId)
    : undefined;
  const alt = file.originalName || "사진";

  useEffect(() => {
    if (!parsed || !archiveId || !file.key) {
      setUrl("");
      return;
    }

    let cancelled = false;
    FileAPI.RSignedUrlArchive({
      query: {
        key: file.key,
        archive: archiveId,
        label: parsed.label,
        fieldLabel: parsed.fieldLabel,
        fileName: file.originalName,
      },
    })
      .then(({ preSignedUrl }) => {
        if (!cancelled) setUrl(preSignedUrl || "");
      })
      .catch(() => {
        if (!cancelled) setUrl("");
      });

    return () => {
      cancelled = true;
    };
    // FileAPI is recreated each render; primitive inputs are the fetch key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, archiveId, file.key, file.originalName]);

  if (!url) {
    return <span>{alt}</span>;
  }

  return (
    <div style={{ margin: "auto" }}>
      <img src={url} alt={alt} />
    </div>
  );
};

export default ArchiveImage;
