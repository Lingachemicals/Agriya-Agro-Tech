export const sectionDefinitions = [
  ['shortDescription','Short Description'],
  ['benefits','Benefits'],
  ['modeOfAction','Mode of Action'],
  ['recommendedCrops','Recommended Crops'],
  ['application','Application'],
  ['potency','Potency'],
  ['dosage','Dosage']
];
export function productSections(product) {
  if (product.sections) return Object.fromEntries(sectionDefinitions.map(([key]) => [key, product.sections[key] || '']));
  const sections = Object.fromEntries(sectionDefinitions.map(([key]) => [key, '']));
  let current = 'shortDescription';
  const names = {'benefits':'benefits','mode of action':'modeOfAction','recommended crops':'recommendedCrops','application':'application','potency':'potency','dosage':'dosage'};
  for (const line of (product.content || []).join('\n\n').split('\n')) {
    const match = line.match(/^\s*[•\-]?\s*(Benefits|Mode of Action|Recommended Crops|Application|Potency|Dosage)\s*(?::\s*(.*))?\s*$/i);
    if (match) { current = names[match[1].toLowerCase()]; if (match[2]) sections[current] += match[2] + '\n'; }
    else sections[current] += line + '\n';
  }
  return Object.fromEntries(Object.entries(sections).map(([key,value]) => [key,value.trim()]));
}
export function sectionsContent(sections) {
  return sectionDefinitions.filter(([key]) => sections[key]?.trim()).map(([key,label]) => label+'\n'+sections[key].trim());
}
