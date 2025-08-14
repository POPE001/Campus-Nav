import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

const SignUp = () => {
  const router = useRouter();
  const { userType } = useLocalSearchParams();

  useEffect(() => {
    if (userType === 'student') {
      router.replace('/student-signup');
    } else if (userType === 'staff') {
      router.replace('/staff-signup');
    } else {
      // Default to user type selection if no userType is provided
      router.replace('/user-type');
    }
  }, [userType]);

  return null; // This component just redirects
};

export default SignUp;
