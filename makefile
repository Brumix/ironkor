

build_android:
	eas build --platform android --profile preview

build_ios:
	eas build --platform ios --profile preview

build_all:
	eas build --profile preview

build_production:
	eas build --profile production