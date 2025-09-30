import bookMap from "../components/bookMap.json";

export function normalizeReference(ref) {
  const refLower = ref.toLowerCase();
  console.log("normalizeReference input:", ref, "lower:", refLower);

  const match = Object.keys(bookMap)
    .sort((a, b) => b.length - a.length)
    .find(name => refLower.startsWith(name));

  console.log("match:", match);

  if (match) {
    const result = refLower.replace(match, bookMap[match]);
    console.log("result:", result);
    return result;
  }

  return refLower;
}
