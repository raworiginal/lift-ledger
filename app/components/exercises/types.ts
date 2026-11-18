export type MuscleOption = {
  id: string;
  nameEn: string;
  imagePath: string | null;
};

export type Exercise = {
  id: string;
  nameEn: string;
  descriptionEn: string;
  category: string;
  forceType: string;
  mechanic: string;
  difficulty: string;
  equipment: string | null;
  images: Record<string, Record<string, string>>;
  primaryMuscles: MuscleOption[];
  secondaryMuscles: MuscleOption[];
};

export type ExerciseSimilarity = {
  score: number;
  sharedMuscles: string[];
  sharedPrimaryMuscles: string[];
  sharedSecondaryMuscles: string[];
  sameVariationGroup: boolean;
};

export type ExerciseAlternative = Exercise & {
  similarity: ExerciseSimilarity;
};

export type ExerciseListResponse = {
  items: Exercise[];
  total: number;
  limit: number;
  offset: number;
};

export type ExerciseFilters = {
  search: string;
  bodyPart: string;
  equipment: string;
  muscle: string;
  muscleRole: string;
  forceType: string;
  category: string;
  mechanic: string;
  limit: number;
  offset: number;
};

export type FilterOptions = {
  bodyParts: string[];
  categories: string[];
  equipment: string[];
  forceTypes: string[];
  mechanics: string[];
  muscles: MuscleOption[];
};
