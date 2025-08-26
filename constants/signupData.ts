/**
 * Centralized data arrays for signup forms
 * Moved outside components to prevent recreation on every render
 */

export const levels = ['100', '200', '300', '400', '500', 'Graduate'];

export const faculties = [
  'Faculty of Arts',
  'Faculty of Law',
  'Faculty of Science',
  'Faculty of Engineering and Technology',
  'Faculty of Social Sciences',
  'Faculty of Education',
  'Faculty of Environmental Design and Management',
  'Faculty of Agriculture',
  'Faculty of Basic Medical Sciences',
  'Faculty of Clinical Sciences',
  'Faculty of Dentistry',
  'Faculty of Pharmacy',
  'College of Health Sciences',
  'Administration',
  'Registry',
  'Library',
  'ICT Centre'
];

/**
 * Faculty to Departments mapping for OAU
 * Based on actual OAU faculty structures
 */
export interface FacultyDepartments {
  [faculty: string]: string[];
}

export const facultyDepartments: FacultyDepartments = {
  'Faculty of Arts': [
    'Department of English',
    'Department of History',
    'Department of Linguistics and African Languages',
    'Department of Philosophy',
    'Department of Religious Studies',
    'Department of Foreign Languages',
    'Department of Archaeology and Anthropology',
    'Department of Fine Arts',
    'Department of Music',
    'Department of Theatre Arts'
  ],
  'Faculty of Law': [
    'Department of Jurisprudence and International Law',
    'Department of Public Law',
    'Department of Private Law',
    'Department of Commercial and Industrial Law'
  ],
  'Faculty of Science': [
    'Department of Chemistry',
    'Department of Computer Science and Engineering',
    'Department of Geology',
    'Department of Mathematics',
    'Department of Physics',
    'Department of Statistics',
    'Department of Zoology',
    'Department of Botany',
    'Department of Microbiology'
  ],
  'Faculty of Engineering and Technology': [
    'Department of Agricultural and Environmental Engineering',
    'Department of Civil Engineering',
    'Department of Computer Science and Engineering',
    'Department of Electrical and Electronics Engineering',
    'Department of Materials Science and Engineering',
    'Department of Mechanical Engineering',
    'Department of Food Science and Technology'
  ],
  'Faculty of Social Sciences': [
    'Department of Economics',
    'Department of Geography',
    'Department of Political Science',
    'Department of Psychology',
    'Department of Sociology and Anthropology',
    'Department of Demography and Social Statistics',
    'Department of Local Government Studies'
  ],
  'Faculty of Education': [
    'Department of Adult Education',
    'Department of Arts and Social Sciences Education',
    'Department of Educational Foundations and Counselling',
    'Department of Educational Technology',
    'Department of Science and Technology Education',
    'Department of Special Education'
  ],
  'Faculty of Environmental Design and Management': [
    'Department of Architecture',
    'Department of Building',
    'Department of Estate Management',
    'Department of Fine Arts',
    'Department of Quantity Surveying',
    'Department of Urban and Regional Planning'
  ],
  'Faculty of Agriculture': [
    'Department of Agricultural Economics',
    'Department of Agricultural Extension and Rural Development',
    'Department of Animal Sciences',
    'Department of Crop Production and Protection',
    'Department of Family, Nutrition and Consumer Sciences',
    'Department of Forest Resources Management',
    'Department of Soil Science and Land Resources Management'
  ],
  'Faculty of Basic Medical Sciences': [
    'Department of Anatomy',
    'Department of Biochemistry',
    'Department of Physiology',
    'Department of Pharmacology and Therapeutics',
    'Department of Chemical Pathology'
  ],
  'Faculty of Clinical Sciences': [
    'Department of Anaesthesia',
    'Department of Community Health',
    'Department of Dermatology',
    'Department of Family Medicine',
    'Department of Internal Medicine',
    'Department of Mental Health',
    'Department of Obstetrics, Gynaecology and Perinatology',
    'Department of Ophthalmology',
    'Department of Orthopaedic Surgery and Traumatology',
    'Department of Otorhinolaryngology',
    'Department of Paediatrics and Child Health',
    'Department of Pathology',
    'Department of Radiology',
    'Department of Surgery'
  ],
  'Faculty of Dentistry': [
    'Department of Child Dental Health',
    'Department of Oral and Maxillofacial Surgery',
    'Department of Oral Pathology and Medicine',
    'Department of Preventive Dentistry',
    'Department of Restorative Dentistry'
  ],
  'Faculty of Pharmacy': [
    'Department of Clinical Pharmacy and Pharmacy Administration',
    'Department of Pharmaceutical Chemistry',
    'Department of Pharmaceutical Microbiology',
    'Department of Pharmacognosy',
    'Department of Pharmacology and Toxicology',
    'Department of Pharmaceutics'
  ],
  'College of Health Sciences': [
    'Department of Nursing Science',
    'Department of Medical Laboratory Science',
    'Department of Physiotherapy',
    'Department of Medical Rehabilitation'
  ],
  'Administration': [
    'Vice-Chancellor\'s Office',
    'Registrar\'s Office',
    'Bursar\'s Office',
    'Academic Planning Unit',
    'Student Affairs',
    'Public Relations Unit',
    'Internal Audit Unit',
    'Legal Unit',
    'Security Unit',
    'Works and Maintenance',
    'Procurement Unit'
  ],
  'Registry': [
    'Academic Registry',
    'Student Registry',
    'Examinations and Records',
    'Admissions Office',
    'Academic Affairs',
    'Senate Office'
  ],
  'Library': [
    'Kenneth Dike Library',
    'Faculty Libraries',
    'Digital Library Services',
    'Technical Services',
    'Reader Services',
    'Special Collections'
  ],
  'ICT Centre': [
    'Network Operations',
    'Systems Administration',
    'Web Development',
    'Database Management',
    'Technical Support',
    'E-Learning Support',
    'Digital Services'
  ]
};

export const positions = [
  'Professor',
  'Associate Professor',
  'Senior Lecturer',
  'Lecturer I',
  'Lecturer II',
  'Assistant Lecturer',
  'Graduate Assistant',
  'Research Fellow',
  'Postdoctoral Fellow',
  'Senior Research Fellow',
  'Principal Research Fellow',
  'Chief Research Fellow',
  'Director',
  'Deputy Director',
  'Assistant Director',
  'Principal Assistant Registrar',
  'Senior Assistant Registrar',
  'Assistant Registrar',
  'Administrative Officer',
  'Senior Administrative Officer',
  'Chief Administrative Officer',
  'Librarian',
  'Deputy Librarian',
  'Principal Librarian',
  'Senior Librarian',
  'Assistant Librarian',
  'Library Officer',
  'ICT Officer',
  'Systems Administrator',
  'Database Administrator',
  'Web Developer',
  'Software Developer',
  'Network Administrator',
  'Technical Officer',
  'Senior Technical Officer',
  'Chief Technical Officer',
  'Laboratory Technologist',
  'Senior Laboratory Technologist',
  'Chief Laboratory Technologist',
  'Accountant',
  'Senior Accountant',
  'Chief Accountant',
  'Bursar',
  'Deputy Bursar',
  'Assistant Bursar',
  'Security Officer',
  'Chief Security Officer',
  'Maintenance Officer',
  'Grounds Keeper',
  'Cleaner',
  'Driver',
  'Porter',
  'Secretary',
  'Personal Assistant',
  'Executive Assistant',
  'Data Entry Clerk',
  'Records Officer',
  'Stores Officer',
  'Procurement Officer',
  'Audit Officer',
  'Internal Auditor',
  'Medical Officer',
  'Nurse',
  'Pharmacist',
  'Laboratory Scientist',
  'Radiographer',
  'Physiotherapist',
  'Counselor',
  'Student Affairs Officer',
  'Admission Officer',
  'Examination Officer',
  'Other'
];
