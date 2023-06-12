import _ from "lodash";
import { TSeason } from "types/seasons";

export const zipSeasonsFormEvaluation = (seasons: TSeason[]) => {
  const _subjectLabels: Set<string> = new Set();
  const subjectLabelsBySeason: { [key: string]: string[] } = {};
  const _evaluationFieldsByYear: Set<string> = new Set();
  const _evaluationFieldsByTerm: { [key: string]: Set<string> } = {};

  for (let season of seasons) {
    if (season.subjects?.label.length > 0) {
      for (let lb of season.subjects?.label) _subjectLabels.add(lb);
      subjectLabelsBySeason[season._id] = season.subjects?.label || [];
    }

    if (!(season.term in _evaluationFieldsByTerm))
      _evaluationFieldsByTerm[season.term] = new Set();

    for (let ev of season.formEvaluation) {
      if (ev.combineBy === "year") {
        _evaluationFieldsByYear.add(
          JSON.stringify({ label: ev.label, type: ev.type })
        );
      } else {
        _evaluationFieldsByTerm[season.term].add(
          JSON.stringify({ label: ev.label, type: ev.type })
        );
      }
    }
  }

  const subjectLabels = Array.from(_subjectLabels);

  const evaluationFieldsByTerm: { [key: string]: object[] } = {};
  for (let key in _evaluationFieldsByTerm) {
    evaluationFieldsByTerm[key] = Array.from(_evaluationFieldsByTerm[key]).map(
      (text) => JSON.parse(text)
    );
  }

  const evaluationFieldsByYear = Array.from(_evaluationFieldsByYear).map(
    (text) => JSON.parse(text)
  );

  const terms = _.sortBy(Object.keys(_evaluationFieldsByTerm));

  return {
    subjectLabels,
    subjectLabelsBySeason,
    evaluationFieldsByYear,
    evaluationFieldsByTerm,
    terms,
  };
};
