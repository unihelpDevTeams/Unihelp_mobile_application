import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../shared/theme/ThemeContext';
import { useThemeStyles } from '../../shared/theme/createStyles';

/**
 * Progress indicator showing steps with checkmarks for completed steps.
 */
export default function ProgressIndicator({ currentStep, totalSteps = 4 }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: s['2xl'], paddingVertical: s.lg },
    connector: { flex: 1, height: 2, backgroundColor: c.borderDefault, marginHorizontal: 4, borderRadius: 1 },
    connectorCompleted: { backgroundColor: c.brand },
    stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.surfaceSecondary, borderWidth: 2, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center' },
    stepDotCompleted: { backgroundColor: c.brand, borderColor: c.brand },
    stepDotCurrent: { borderColor: c.brand, backgroundColor: c.brandLight },
    stepNumber: { width: 10, height: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
    innerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.borderDefault },
    innerDotCurrent: { backgroundColor: c.brand },
    stepNumberCurrent: {},
  }));

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={`Step ${currentStep} of ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <React.Fragment key={stepNumber}>
            {i > 0 && (
              <View
                style={[
                  styles.connector,
                  isCompleted && styles.connectorCompleted,
                ]}
              />
            )}
            <View
              style={[
                styles.stepDot,
                isCompleted && styles.stepDotCompleted,
                isCurrent && styles.stepDotCurrent,
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={14} color={colors.onBrand} />
              ) : (
                <View style={[styles.stepNumber, isCurrent && styles.stepNumberCurrent]}>
                  <View style={[styles.innerDot, isCurrent && styles.innerDotCurrent]} />
                </View>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}
