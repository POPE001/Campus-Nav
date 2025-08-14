import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { CampusNavigationScreen } from './CampusNavigationScreen';

interface NavigationModalProps {
  visible: boolean;
  targetVenueId: string;
  onClose: () => void;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  visible,
  targetVenueId,
  onClose,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <CampusNavigationScreen
        targetVenueId={targetVenueId}
        onClose={onClose}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  // No additional styles needed as CampusNavigationScreen handles its own styling
});
