export interface MergedVaccination {
  id: string;
  name: string;
  age: string;
  dose: string;
  description: string;
  status: 0 | 1; // 0 = pending, 1 = complete
  imageUrl?: string;
}

// Mock data for development - replace with actual API calls
export const mockVaccinations: MergedVaccination[] = [
  {
    id: '1',
    name: 'Hepatitis B',
    age: 'Birth',
    dose: '1st dose',
    description: 'Protects against hepatitis B virus infection, which can cause liver disease.',
    status: 1,
    imageUrl: null,
  },
  {
    id: '2',
    name: 'DTaP',
    age: '2 months',
    dose: '1st dose',
    description: 'Protects against diphtheria, tetanus, and pertussis (whooping cough).',
    status: 0,
  },
  {
    id: '3',
    name: 'Hib',
    age: '2 months',
    dose: '1st dose',
    description: 'Protects against Haemophilus influenzae type b, which can cause meningitis.',
    status: 0,
  },
  {
    id: '4',
    name: 'IPV',
    age: '2 months',
    dose: '1st dose',
    description: 'Protects against polio, a disease that can cause paralysis.',
    status: 0,
  },
  {
    id: '5',
    name: 'PCV13',
    age: '2 months',
    dose: '1st dose',
    description: 'Protects against pneumococcal disease, which can cause pneumonia and meningitis.',
    status: 0,
  },
  {
    id: '6',
    name: 'RV',
    age: '2 months',
    dose: '1st dose',
    description: 'Protects against rotavirus, which causes severe diarrhea and vomiting.',
    status: 0,
  },
];

export class VaccinationService {
  static async getVaccinations(): Promise<MergedVaccination[]> {
    // In a real app, this would make an API call
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockVaccinations), 500);
    });
  }

  static async updateVaccinationStatus(
    id: string, 
    status: 0 | 1, 
    imageFile?: File
  ): Promise<{ success: boolean; imageUrl?: string }> {
    // In a real app, this would make an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ 
          success: true, 
          imageUrl: imageFile ? 'https://example.com/vaccination-record.jpg' : undefined 
        });
      }, 1000);
    });
  }
}