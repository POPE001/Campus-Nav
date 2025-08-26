import React from 'react';
import { View, Text } from 'react-native';
import { useScreenStyles } from '@/hooks/useScreenStyles';

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  style?: any;
}

export const Section: React.FC<SectionProps> = ({ title, children, style }) => {
  const { styles } = useScreenStyles();

  return (
    <View style={[styles.section, style]}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};
