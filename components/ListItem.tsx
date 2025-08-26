import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScreenStyles } from '@/hooks/useScreenStyles';

interface ListItemProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  rightComponent,
  showChevron = true,
  disabled = false,
}) => {
  const { styles, theme } = useScreenStyles();

  const Component = onPress && !disabled ? TouchableOpacity : View;

  return (
    <Component
      style={[
        styles.listItem,
        disabled && { opacity: 0.5 }
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {icon && (
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: iconColor ? `${iconColor}20` : `${theme.primary}20`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
            <Ionicons
              name={icon}
              size={20}
              color={iconColor || theme.primary}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.bodyText, { fontWeight: '500' }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.secondaryText, { marginTop: 2 }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {value && (
          <Text style={[styles.secondaryText, { marginRight: 8 }]}>
            {value}
          </Text>
        )}
        {rightComponent}
        {showChevron && !rightComponent && onPress && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.textSecondary}
            style={{ marginLeft: 8 }}
          />
        )}
      </View>
    </Component>
  );
};
