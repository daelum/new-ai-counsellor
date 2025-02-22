import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Counseling: undefined;
  Bible: undefined;
  Devotional: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  BibleReader: undefined;
};

export type BibleScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Bible'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type BibleReaderScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = {
  navigation: NativeStackNavigationProp<RootStackParamList, T>;
  route: RouteProp<RootStackParamList, T>;
}; 