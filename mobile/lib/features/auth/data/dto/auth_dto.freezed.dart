// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'auth_dto.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LoginRequest {

 String get email; String get password;
/// Create a copy of LoginRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LoginRequestCopyWith<LoginRequest> get copyWith => _$LoginRequestCopyWithImpl<LoginRequest>(this as LoginRequest, _$identity);

  /// Serializes this LoginRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LoginRequest&&(identical(other.email, email) || other.email == email)&&(identical(other.password, password) || other.password == password));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,email,password);

@override
String toString() {
  return 'LoginRequest(email: $email, password: $password)';
}


}

/// @nodoc
abstract mixin class $LoginRequestCopyWith<$Res>  {
  factory $LoginRequestCopyWith(LoginRequest value, $Res Function(LoginRequest) _then) = _$LoginRequestCopyWithImpl;
@useResult
$Res call({
 String email, String password
});




}
/// @nodoc
class _$LoginRequestCopyWithImpl<$Res>
    implements $LoginRequestCopyWith<$Res> {
  _$LoginRequestCopyWithImpl(this._self, this._then);

  final LoginRequest _self;
  final $Res Function(LoginRequest) _then;

/// Create a copy of LoginRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? email = null,Object? password = null,}) {
  return _then(_self.copyWith(
email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,password: null == password ? _self.password : password // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [LoginRequest].
extension LoginRequestPatterns on LoginRequest {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LoginRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LoginRequest() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LoginRequest value)  $default,){
final _that = this;
switch (_that) {
case _LoginRequest():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LoginRequest value)?  $default,){
final _that = this;
switch (_that) {
case _LoginRequest() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String email,  String password)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LoginRequest() when $default != null:
return $default(_that.email,_that.password);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String email,  String password)  $default,) {final _that = this;
switch (_that) {
case _LoginRequest():
return $default(_that.email,_that.password);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String email,  String password)?  $default,) {final _that = this;
switch (_that) {
case _LoginRequest() when $default != null:
return $default(_that.email,_that.password);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LoginRequest implements LoginRequest {
  const _LoginRequest({required this.email, required this.password});
  factory _LoginRequest.fromJson(Map<String, dynamic> json) => _$LoginRequestFromJson(json);

@override final  String email;
@override final  String password;

/// Create a copy of LoginRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LoginRequestCopyWith<_LoginRequest> get copyWith => __$LoginRequestCopyWithImpl<_LoginRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LoginRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LoginRequest&&(identical(other.email, email) || other.email == email)&&(identical(other.password, password) || other.password == password));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,email,password);

@override
String toString() {
  return 'LoginRequest(email: $email, password: $password)';
}


}

/// @nodoc
abstract mixin class _$LoginRequestCopyWith<$Res> implements $LoginRequestCopyWith<$Res> {
  factory _$LoginRequestCopyWith(_LoginRequest value, $Res Function(_LoginRequest) _then) = __$LoginRequestCopyWithImpl;
@override @useResult
$Res call({
 String email, String password
});




}
/// @nodoc
class __$LoginRequestCopyWithImpl<$Res>
    implements _$LoginRequestCopyWith<$Res> {
  __$LoginRequestCopyWithImpl(this._self, this._then);

  final _LoginRequest _self;
  final $Res Function(_LoginRequest) _then;

/// Create a copy of LoginRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? email = null,Object? password = null,}) {
  return _then(_LoginRequest(
email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,password: null == password ? _self.password : password // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$RegisterRequest {

 String get email; String get password; String get name;
/// Create a copy of RegisterRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RegisterRequestCopyWith<RegisterRequest> get copyWith => _$RegisterRequestCopyWithImpl<RegisterRequest>(this as RegisterRequest, _$identity);

  /// Serializes this RegisterRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RegisterRequest&&(identical(other.email, email) || other.email == email)&&(identical(other.password, password) || other.password == password)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,email,password,name);

@override
String toString() {
  return 'RegisterRequest(email: $email, password: $password, name: $name)';
}


}

/// @nodoc
abstract mixin class $RegisterRequestCopyWith<$Res>  {
  factory $RegisterRequestCopyWith(RegisterRequest value, $Res Function(RegisterRequest) _then) = _$RegisterRequestCopyWithImpl;
@useResult
$Res call({
 String email, String password, String name
});




}
/// @nodoc
class _$RegisterRequestCopyWithImpl<$Res>
    implements $RegisterRequestCopyWith<$Res> {
  _$RegisterRequestCopyWithImpl(this._self, this._then);

  final RegisterRequest _self;
  final $Res Function(RegisterRequest) _then;

/// Create a copy of RegisterRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? email = null,Object? password = null,Object? name = null,}) {
  return _then(_self.copyWith(
email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,password: null == password ? _self.password : password // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [RegisterRequest].
extension RegisterRequestPatterns on RegisterRequest {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RegisterRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RegisterRequest() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RegisterRequest value)  $default,){
final _that = this;
switch (_that) {
case _RegisterRequest():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RegisterRequest value)?  $default,){
final _that = this;
switch (_that) {
case _RegisterRequest() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String email,  String password,  String name)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RegisterRequest() when $default != null:
return $default(_that.email,_that.password,_that.name);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String email,  String password,  String name)  $default,) {final _that = this;
switch (_that) {
case _RegisterRequest():
return $default(_that.email,_that.password,_that.name);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String email,  String password,  String name)?  $default,) {final _that = this;
switch (_that) {
case _RegisterRequest() when $default != null:
return $default(_that.email,_that.password,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RegisterRequest implements RegisterRequest {
  const _RegisterRequest({required this.email, required this.password, required this.name});
  factory _RegisterRequest.fromJson(Map<String, dynamic> json) => _$RegisterRequestFromJson(json);

@override final  String email;
@override final  String password;
@override final  String name;

/// Create a copy of RegisterRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RegisterRequestCopyWith<_RegisterRequest> get copyWith => __$RegisterRequestCopyWithImpl<_RegisterRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RegisterRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RegisterRequest&&(identical(other.email, email) || other.email == email)&&(identical(other.password, password) || other.password == password)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,email,password,name);

@override
String toString() {
  return 'RegisterRequest(email: $email, password: $password, name: $name)';
}


}

/// @nodoc
abstract mixin class _$RegisterRequestCopyWith<$Res> implements $RegisterRequestCopyWith<$Res> {
  factory _$RegisterRequestCopyWith(_RegisterRequest value, $Res Function(_RegisterRequest) _then) = __$RegisterRequestCopyWithImpl;
@override @useResult
$Res call({
 String email, String password, String name
});




}
/// @nodoc
class __$RegisterRequestCopyWithImpl<$Res>
    implements _$RegisterRequestCopyWith<$Res> {
  __$RegisterRequestCopyWithImpl(this._self, this._then);

  final _RegisterRequest _self;
  final $Res Function(_RegisterRequest) _then;

/// Create a copy of RegisterRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? email = null,Object? password = null,Object? name = null,}) {
  return _then(_RegisterRequest(
email: null == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String,password: null == password ? _self.password : password // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$AuthResponse {

 bool get success; String? get token;// Usually in data.token, flattening for simplicity if possible or adapt
 Map<String, dynamic>? get data; String? get error;
/// Create a copy of AuthResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AuthResponseCopyWith<AuthResponse> get copyWith => _$AuthResponseCopyWithImpl<AuthResponse>(this as AuthResponse, _$identity);

  /// Serializes this AuthResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AuthResponse&&(identical(other.success, success) || other.success == success)&&(identical(other.token, token) || other.token == token)&&const DeepCollectionEquality().equals(other.data, data)&&(identical(other.error, error) || other.error == error));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,success,token,const DeepCollectionEquality().hash(data),error);

@override
String toString() {
  return 'AuthResponse(success: $success, token: $token, data: $data, error: $error)';
}


}

/// @nodoc
abstract mixin class $AuthResponseCopyWith<$Res>  {
  factory $AuthResponseCopyWith(AuthResponse value, $Res Function(AuthResponse) _then) = _$AuthResponseCopyWithImpl;
@useResult
$Res call({
 bool success, String? token, Map<String, dynamic>? data, String? error
});




}
/// @nodoc
class _$AuthResponseCopyWithImpl<$Res>
    implements $AuthResponseCopyWith<$Res> {
  _$AuthResponseCopyWithImpl(this._self, this._then);

  final AuthResponse _self;
  final $Res Function(AuthResponse) _then;

/// Create a copy of AuthResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? success = null,Object? token = freezed,Object? data = freezed,Object? error = freezed,}) {
  return _then(_self.copyWith(
success: null == success ? _self.success : success // ignore: cast_nullable_to_non_nullable
as bool,token: freezed == token ? _self.token : token // ignore: cast_nullable_to_non_nullable
as String?,data: freezed == data ? _self.data : data // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,error: freezed == error ? _self.error : error // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [AuthResponse].
extension AuthResponsePatterns on AuthResponse {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AuthResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AuthResponse() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AuthResponse value)  $default,){
final _that = this;
switch (_that) {
case _AuthResponse():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AuthResponse value)?  $default,){
final _that = this;
switch (_that) {
case _AuthResponse() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool success,  String? token,  Map<String, dynamic>? data,  String? error)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AuthResponse() when $default != null:
return $default(_that.success,_that.token,_that.data,_that.error);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool success,  String? token,  Map<String, dynamic>? data,  String? error)  $default,) {final _that = this;
switch (_that) {
case _AuthResponse():
return $default(_that.success,_that.token,_that.data,_that.error);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool success,  String? token,  Map<String, dynamic>? data,  String? error)?  $default,) {final _that = this;
switch (_that) {
case _AuthResponse() when $default != null:
return $default(_that.success,_that.token,_that.data,_that.error);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AuthResponse implements AuthResponse {
  const _AuthResponse({required this.success, this.token, final  Map<String, dynamic>? data, this.error}): _data = data;
  factory _AuthResponse.fromJson(Map<String, dynamic> json) => _$AuthResponseFromJson(json);

@override final  bool success;
@override final  String? token;
// Usually in data.token, flattening for simplicity if possible or adapt
 final  Map<String, dynamic>? _data;
// Usually in data.token, flattening for simplicity if possible or adapt
@override Map<String, dynamic>? get data {
  final value = _data;
  if (value == null) return null;
  if (_data is EqualUnmodifiableMapView) return _data;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}

@override final  String? error;

/// Create a copy of AuthResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AuthResponseCopyWith<_AuthResponse> get copyWith => __$AuthResponseCopyWithImpl<_AuthResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AuthResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AuthResponse&&(identical(other.success, success) || other.success == success)&&(identical(other.token, token) || other.token == token)&&const DeepCollectionEquality().equals(other._data, _data)&&(identical(other.error, error) || other.error == error));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,success,token,const DeepCollectionEquality().hash(_data),error);

@override
String toString() {
  return 'AuthResponse(success: $success, token: $token, data: $data, error: $error)';
}


}

/// @nodoc
abstract mixin class _$AuthResponseCopyWith<$Res> implements $AuthResponseCopyWith<$Res> {
  factory _$AuthResponseCopyWith(_AuthResponse value, $Res Function(_AuthResponse) _then) = __$AuthResponseCopyWithImpl;
@override @useResult
$Res call({
 bool success, String? token, Map<String, dynamic>? data, String? error
});




}
/// @nodoc
class __$AuthResponseCopyWithImpl<$Res>
    implements _$AuthResponseCopyWith<$Res> {
  __$AuthResponseCopyWithImpl(this._self, this._then);

  final _AuthResponse _self;
  final $Res Function(_AuthResponse) _then;

/// Create a copy of AuthResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? success = null,Object? token = freezed,Object? data = freezed,Object? error = freezed,}) {
  return _then(_AuthResponse(
success: null == success ? _self.success : success // ignore: cast_nullable_to_non_nullable
as bool,token: freezed == token ? _self.token : token // ignore: cast_nullable_to_non_nullable
as String?,data: freezed == data ? _self._data : data // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,error: freezed == error ? _self.error : error // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
