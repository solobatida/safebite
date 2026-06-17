import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

/** Supermarket shelf + comic boom backdrop for welcome screen */
export function ShelfBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <View style={styles.shelfTop} />
      <View style={styles.shelfRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.product, { height: 40 + (i % 3) * 18 }]} />
        ))}
      </View>
      <View style={styles.shelfMid} />
      <View style={styles.shelfRow}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.productAlt, { height: 32 + (i % 4) * 14 }]} />
        ))}
      </View>
      <View style={styles.boom}>
        <View style={styles.boomInner}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.shelfDark,
    paddingTop: 48,
  },
  shelfTop: {
    height: 8,
    backgroundColor: colors.shelfMid,
    marginHorizontal: 12,
    borderRadius: 4,
  },
  shelfRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 12,
    minHeight: 100,
    backgroundColor: '#4E342E',
    marginHorizontal: 12,
    borderBottomWidth: 6,
    borderBottomColor: colors.shelfMid,
  },
  product: {
    width: 36,
    backgroundColor: '#81C784',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  productAlt: {
    width: 32,
    backgroundColor: '#64B5F6',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1565C0',
  },
  shelfMid: {
    height: 12,
    marginTop: 8,
  },
  boom: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  boomInner: {
    backgroundColor: colors.boomYellow,
    borderWidth: 4,
    borderColor: colors.boomOrange,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
