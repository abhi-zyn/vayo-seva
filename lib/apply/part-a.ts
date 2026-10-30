// Part A: personal details asked for EVERY service, in the spec's order.
// (Field 3, "name in Malayalam", isn't asked: it's the transcript of field 2.)

import type { Answers, FieldDef, Option } from "./types";
import { validators } from "./validate";

const forOther = (a: Answers) => a.applying_for?.english_value === "Family member";

export const DISTRICTS: Option[] = [
  { value: "Thiruvananthapuram", ml: "തിരുവനന്തപുരം" },
  { value: "Kollam", ml: "കൊല്ലം" },
  { value: "Pathanamthitta", ml: "പത്തനംതിട്ട" },
  { value: "Alappuzha", ml: "ആലപ്പുഴ" },
  { value: "Kottayam", ml: "കോട്ടയം" },
  { value: "Idukki", ml: "ഇടുക്കി" },
  { value: "Ernakulam", ml: "എറണാകുളം" },
  { value: "Thrissur", ml: "തൃശ്ശൂർ" },
  { value: "Palakkad", ml: "പാലക്കാട്" },
  { value: "Malappuram", ml: "മലപ്പുറം" },
  { value: "Kozhikode", ml: "കോഴിക്കോട്" },
  { value: "Wayanad", ml: "വയനാട്" },
  { value: "Kannur", ml: "കണ്ണൂർ" },
  { value: "Kasaragod", ml: "കാസർഗോഡ്" },
];

export const PART_A: FieldDef[] = [
  // Applicant
  {
    id: "applying_for",
    label: "Applying for",
    ask: "ഈ സർട്ടിഫിക്കറ്റ് നിങ്ങൾക്കാണോ, കുടുംബത്തിലെ മറ്റാർക്കെങ്കിലുമാണോ?",
    kind: "choice",
    options: [
      { value: "Self", ml: "എനിക്ക് തന്നെ" },
      { value: "Family member", ml: "കുടുംബത്തിലെ മറ്റൊരാൾക്ക്" },
    ],
  },
  {
    id: "full_name",
    label: "Full name (as in Aadhaar)",
    ask: (a) =>
      forOther(a)
        ? "സർട്ടിഫിക്കറ്റ് ആർക്കാണോ, അവരുടെ ആധാറിൽ ഉള്ളതുപോലെ മുഴുവൻ പേര് പറയൂ."
        : "ആധാറിൽ ഉള്ളതുപോലെ മുഴുവൻ പേര് പറയൂ.",
    kind: "name",
  },
  {
    id: "gender",
    label: "Gender",
    ask: "പുരുഷനാണോ സ്ത്രീയാണോ?",
    kind: "choice",
    options: [
      { value: "Male", ml: "പുരുഷൻ" },
      { value: "Female", ml: "സ്ത്രീ" },
      { value: "Transgender", ml: "ട്രാൻസ്ജെൻഡർ" },
    ],
  },
  {
    id: "date_of_birth",
    label: "Date of birth",
    ask: "ജനന തീയതി പറയൂ. ദിവസം, മാസം, വർഷം എന്ന ക്രമത്തിൽ.",
    kind: "date",
    placeholder: "DD/MM/YYYY",
    validate: validators.pastDate,
  },
  {
    id: "guardian_type",
    label: "Father / Mother / Husband / Guardian",
    ask: "അച്ഛന്റെ പേരാണോ ഭർത്താവിന്റെ പേരാണോ കൊടുക്കേണ്ടത്?",
    kind: "choice",
    options: [
      { value: "Father", ml: "അച്ഛൻ" },
      { value: "Mother", ml: "അമ്മ" },
      { value: "Husband", ml: "ഭർത്താവ്" },
      { value: "Guardian", ml: "രക്ഷിതാവ്" },
    ],
  },
  { id: "guardian_name", label: "Father / Mother / Husband / Guardian name", ask: "അവരുടെ പേര് പറയൂ.", kind: "name" },
  {
    id: "mother_name",
    label: "Mother's name",
    ask: "അമ്മയുടെ പേര് പറയൂ. പറയേണ്ടെങ്കിൽ ഇല്ല എന്ന് പറയൂ.",
    kind: "name",
    optional: true,
    when: (a) => a.guardian_type?.english_value !== "Mother",
  },
  // Address
  { id: "house_name", label: "House name", ask: "വീട്ടുപേര് എന്താണ്?", kind: "place" },
  {
    id: "house_number",
    label: "House number",
    ask: "വീട്ടു നമ്പർ അറിയാമോ? അറിയാമെങ്കിൽ പറയൂ, ഇല്ലെങ്കിൽ ഇല്ല എന്ന് പറയൂ.",
    kind: "typed",
    optional: true,
    placeholder: "12/345",
    maxLength: 20,
    validate: validators.houseNumber,
  },
  { id: "locality", label: "Place / street / locality", ask: "സ്ഥലത്തിന്റെ പേര് പറയൂ.", kind: "place" },
  { id: "post_office", label: "Post office", ask: "പോസ്റ്റ് ഓഫീസ് ഏതാണ്?", kind: "place" },
  {
    id: "pin_code",
    label: "PIN code",
    ask: "പിൻ കോഡ് പറയൂ.",
    kind: "digits",
    maxLength: 6,
    validate: validators.pin,
  },
  {
    id: "village",
    label: "Revenue village",
    ask: "ഏത് വില്ലേജിലാണ് വീട്? അറിയില്ലെങ്കിൽ അറിയില്ല എന്ന് പറയൂ.",
    kind: "place",
    optional: true,
  },
  { id: "taluk", label: "Taluk", ask: "താലൂക്ക് ഏതാണ്?", kind: "place" },
  { id: "district", label: "District", ask: "ജില്ല ഏതാണ്?", kind: "choice", options: DISTRICTS },
  {
    id: "local_body",
    label: "Panchayat / Municipality / Corporation",
    ask: "ഏത് പഞ്ചായത്തിലാണ്? മുനിസിപ്പാലിറ്റിയോ കോർപ്പറേഷനോ ആണെങ്കിൽ അതിന്റെ പേര് പറയൂ.",
    kind: "place",
  },
  {
    id: "ward_number",
    label: "Ward number",
    ask: "വാർഡ് നമ്പർ അറിയാമോ? അറിയാമെങ്കിൽ പറയൂ, ഇല്ലെങ്കിൽ ഇല്ല എന്ന് പറയൂ.",
    kind: "digits",
    optional: true,
    maxLength: 3,
    validate: validators.ward,
  },
  // Contact and IDs
  {
    id: "mobile",
    label: "Mobile number",
    ask: "മൊബൈൽ നമ്പർ പറയൂ. ഇതിലേക്ക് ഒ.ടി.പി. വരും.",
    kind: "digits",
    maxLength: 10,
    validate: validators.mobile,
  },
  {
    id: "email",
    label: "Email",
    ask: "ഇമെയിൽ വിലാസം ഉണ്ടോ? ഉണ്ടെങ്കിൽ പറയൂ, ഇല്ലെങ്കിൽ ഇല്ല എന്ന് പറയൂ.",
    kind: "typed",
    optional: true,
    placeholder: "name@example.com",
    maxLength: 80,
    validate: validators.email,
  },
  {
    id: "aadhaar",
    label: "Aadhaar number",
    ask: "ആധാർ നമ്പർ പറയൂ.",
    kind: "digits",
    maxLength: 12,
    validate: validators.aadhaar,
  },
  {
    id: "ration_card",
    label: "Ration card number",
    ask: "റേഷൻ കാർഡ് നമ്പർ പറയൂ.",
    kind: "digits",
    maxLength: 10,
    validate: validators.ration,
  },
  {
    id: "voter_id",
    label: "Voter ID",
    ask: "വോട്ടർ ഐഡി ഉണ്ടോ? ഉണ്ടെങ്കിൽ നമ്പർ പറയൂ, ഇല്ലെങ്കിൽ ഇല്ല എന്ന് പറയൂ.",
    kind: "typed",
    optional: true,
    maxLength: 15,
    validate: validators.voterId,
  },
  // Closing
  { id: "purpose", label: "Purpose", ask: "ഈ സർട്ടിഫിക്കറ്റ് എന്തിനു വേണ്ടിയാണ്?", kind: "translate" },
  {
    id: "helper_name",
    label: "Helper's name",
    ask: "അപേക്ഷ ചെയ്യാൻ സഹായിക്കുന്ന നിങ്ങളുടെ പേര് പറയൂ.",
    kind: "name",
    when: forOther,
  },
  {
    id: "helper_relation",
    label: "Helper's relation to applicant",
    ask: "നിങ്ങൾ അപേക്ഷകന്റെ ആരാണ്?",
    kind: "translate",
    when: forOther,
  },
  {
    id: "otp_call_time",
    label: "Best time to call for OTP",
    ask: "ഒ.ടി.പി.ക്കായി ഓപ്പറേറ്റർ എപ്പോൾ വിളിക്കണം? രാവിലെയോ ഉച്ചയ്ക്കോ വൈകുന്നേരമോ?",
    kind: "choice",
    options: [
      { value: "Morning", ml: "രാവിലെ" },
      { value: "Afternoon", ml: "ഉച്ചയ്ക്ക്" },
      { value: "Evening", ml: "വൈകുന്നേരം" },
    ],
  },
];
