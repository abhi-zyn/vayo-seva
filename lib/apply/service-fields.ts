// Part B "extra details", asked after Part A, per service id in data/services.json.

import type { FieldDef, Option, Step } from "./types";
import { validators } from "./validate";

const YES_NO: Option[] = [
  { value: "yes", ml: "അതെ" },
  { value: "no", ml: "അല്ല" },
];

const religion: FieldDef = { id: "religion", label: "Religion", ask: "മതം ഏതാണ്?", kind: "translate" };
const caste: FieldDef = { id: "caste", label: "Caste", ask: "ജാതി ഏതാണ്?", kind: "name" };
const fatherCaste: FieldDef = { id: "father_caste", label: "Father's caste", ask: "അച്ഛന്റെ ജാതി ഏതാണ്?", kind: "name" };
const birthPlace: FieldDef = { id: "place_of_birth", label: "Place of birth", ask: "എവിടെയാണ് ജനിച്ചത്?", kind: "place" };

export const SERVICE_FIELDS: Record<string, Step[]> = {
  "income-certificate": [
    { id: "occupation", label: "Occupation", ask: "എന്താണ് ജോലി?", kind: "translate" },
    {
      id: "income_sources",
      label: "Income sources (yearly)",
      ask: "വരുമാനം എവിടെ നിന്നൊക്കെയാണ്? ഒരു വർഷം എത്ര?",
      kind: "income",
    },
    {
      id: "family_members_count",
      label: "Number of family members",
      ask: "വീട്ടിൽ എത്ര പേരുണ്ട്?",
      kind: "digits",
      maxLength: 2,
      validate: validators.count,
    },
  ],
  "caste-certificate": [
    religion,
    caste,
    {
      id: "sub_caste",
      label: "Sub-caste",
      ask: "ഉപജാതി ഉണ്ടെങ്കിൽ പറയൂ, ഇല്ലെങ്കിൽ ഇല്ല എന്ന് പറയൂ.",
      kind: "name",
      optional: true,
    },
    fatherCaste,
  ],
  "community-certificate": [
    {
      id: "sc_or_st",
      label: "SC or ST",
      ask: "പട്ടികജാതിയാണോ പട്ടികവർഗമാണോ?",
      kind: "choice",
      options: [
        { value: "SC", ml: "പട്ടികജാതി" },
        { value: "ST", ml: "പട്ടികവർഗം" },
      ],
    },
    religion,
    caste,
    fatherCaste,
  ],
  "nativity-certificate": [
    birthPlace,
    {
      id: "district_or_state_of_birth",
      label: "District / state of birth",
      ask: "ഏത് ജില്ലയിലാണ് ജനിച്ചത്? കേരളത്തിന് പുറത്താണെങ്കിൽ സംസ്ഥാനം പറയൂ.",
      kind: "place",
    },
    {
      id: "father_place_of_birth",
      label: "Father's place of birth",
      ask: "അച്ഛൻ ജനിച്ച സ്ഥലം അറിയാമോ? അറിയാമെങ്കിൽ പറയൂ, ഇല്ലെങ്കിൽ ഇല്ല എന്ന് പറയൂ.",
      kind: "place",
      optional: true,
    },
  ],
  "domicile-certificate": [
    birthPlace,
    {
      id: "years_in_kerala",
      label: "Years living in Kerala",
      ask: "എത്ര വർഷമായി കേരളത്തിൽ താമസിക്കുന്നു?",
      kind: "digits",
      maxLength: 3,
      validate: validators.years,
    },
  ],
  "residence-certificate": [
    {
      id: "years_at_address",
      label: "Years at this address",
      ask: "ഈ വിലാസത്തിൽ എത്ര വർഷമായി താമസിക്കുന്നു?",
      kind: "digits",
      maxLength: 3,
      validate: validators.years,
    },
  ],
  "relationship-certificate": [
    {
      id: "related_person_name",
      label: "Related person's name",
      ask: "ആരുമായുള്ള ബന്ധമാണ് തെളിയിക്കേണ്ടത്? അവരുടെ പേര് പറയൂ.",
      kind: "name",
    },
    { id: "relationship", label: "Relationship", ask: "അവർ അപേക്ഷകന്റെ ആരാണ്?", kind: "translate" },
  ],
  "family-membership-certificate": [
    {
      group: "family_members",
      label: "Family member",
      moreAsk: "ഇനിയും ആരെങ്കിലും ഉണ്ടോ?",
      fields: [
        { id: "name", label: "Name", ask: "കുടുംബാംഗത്തിന്റെ പേര് പറയൂ.", kind: "name" },
        { id: "relation", label: "Relation", ask: "അവർ അപേക്ഷകന്റെ ആരാണ്?", kind: "translate" },
        {
          id: "age",
          label: "Age",
          ask: "അവരുടെ വയസ്സ് എത്ര?",
          kind: "digits",
          maxLength: 3,
          validate: validators.age,
        },
        {
          id: "alive",
          label: "Alive",
          ask: "അവർ ജീവിച്ചിരിപ്പുണ്ടോ?",
          kind: "yesno",
          options: [
            { value: "yes", ml: "ഉണ്ട്" },
            { value: "no", ml: "ഇല്ല" },
          ],
        },
      ],
    },
  ],
  "widow-widower-certificate": [
    { id: "late_spouse_name", label: "Late spouse's name", ask: "മരിച്ച ജീവിതപങ്കാളിയുടെ പേര് പറയൂ.", kind: "name" },
    {
      id: "date_of_death",
      label: "Date of death",
      ask: "മരണ തീയതി പറയൂ. ദിവസം, മാസം, വർഷം എന്ന ക്രമത്തിൽ.",
      kind: "date",
      placeholder: "DD/MM/YYYY",
      validate: validators.pastDate,
    },
    { id: "remarried", label: "Remarried", ask: "വീണ്ടും വിവാഹം കഴിച്ചിട്ടുണ്ടോ?", kind: "yesno", options: YES_NO },
  ],
  "non-creamy-layer-certificate": [
    religion,
    caste,
    { id: "father_occupation", label: "Father's occupation", ask: "അച്ഛന്റെ ജോലി എന്താണ്?", kind: "translate" },
    { id: "mother_occupation", label: "Mother's occupation", ask: "അമ്മയുടെ ജോലി എന്താണ്?", kind: "translate" },
    {
      id: "parents_annual_income",
      label: "Parents' annual income (Rs)",
      ask: "മാതാപിതാക്കളുടെ ആകെ വാർഷിക വരുമാനം എത്ര രൂപയാണ്?",
      kind: "digits",
      maxLength: 10,
      validate: validators.amount,
    },
  ],
};

export const YES_NO_OPTIONS = YES_NO;
