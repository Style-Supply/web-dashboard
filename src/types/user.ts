export interface OnboardingSubmission {
  id: string;
  created_at: string;

  full_name: string;
  email: string;
  phone_number: string | null;
  floor_apartment: string | null;
  city: string | null;
  zip_code: string | null;
  instagram_handle: string | null;

  height_value: number | null;
  height_unit: string | null;
  shoulder_width_value: number | null;
  shoulder_width_unit: string | null;
  bust_size_value: number | null;
  bust_size_unit: string | null;
  waist_size_value: number | null;
  waist_size_unit: string | null;
  hips_size_value: number | null;
  hips_size_unit: string | null;
  age_value: number | null;
  age_unit: string | null;

  morning_routine_selections: string[] | null;
  approval_status: string | null;
}
