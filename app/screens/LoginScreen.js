import React, { Component } from 'react';
import Toast from '@remobile/react-native-toast';
import { NavigationActions } from 'react-navigation';
import CommonTitleBar from '../views/CommonTitleBar';
import CountEmitter from '../event/CountEmitter';
import StorageUtil from '../utils/StorageUtil';
import LoadingView from '../views/LoadingView';
import Utils from '../utils/Utils';
import { Dimensions, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView,Platform } from 'react-native';
import {
	connect
} from 'react-redux'
import {
	tokenInit
} from '../actions/token'
import {
	SW,
	SH,
	FZ,
} from '../utils/ScreenUtil'
import token from '../reducers/token';

const { width } = Dimensions.get('window');

class LoginScreen extends Component {
	constructor(props) {
		super(props);
		this.state = {
			inputUsername: '',
			username: '',
			password: '',
			showProgress: false,
			avatar: '',
			token: {}
		};
		StorageUtil.get('username', (error, object) => {
			if (!error && object && object.username) {
				this.setState({ username: object.username });
				StorageUtil.get('userInfo-' + object.username, (error, object) => {
					if (!error && object && object.info) {
						let userInfo = object.info;
						if (userInfo && userInfo.avatar) {
							this.setState({ avatar: userInfo.avatar });
						}
					}
				});
			}
		});
	}

	render() {
		return (
			<View style={styles.container}>
				<CommonTitleBar nav={this.props.navigation} title={"登录"} />
				<ScrollView>
					<View style={styles.content}>
						{
							Utils.isEmpty(this.state.username) ? (
								<View style={styles.pwdView}>
									<Image source={require('../../images/ic_launcher.png')}
										style={{ width: 100, height: 100, marginBottom: 50 }} />
									<View style={styles.pwdContainer}>
										<Text style={{ fontSize: 16 }}>用户名：</Text>
										<TextInput onChangeText={(text) => {
											this.setState({ inputUsername: text })
										}} style={styles.textInput} underlineColorAndroid="transparent" 
										autoCapitalize={"none"}/>
									</View>
									<View style={styles.pwdDivider}></View>
								</View>
							) : (
									<View>
										<Image
											source={Utils.isEmpty(this.state.avatar) ? require('../../images/ic.png') : { uri: this.state.avatar }}
											style={{ width: 100, height: 100, marginTop: 100 }} />
										<Text style={styles.usernameText}>{this.state.username}</Text>
									</View>
								)
						}
						{
							this.state.showProgress ? (
								<LoadingView cancel={() => this.setState({ showProgress: false })} />
							) : (null)
						}
						<View style={styles.pwdView}>
							<View style={styles.pwdContainer}>
								<Text style={{ fontSize: 16 }}>密码：</Text>
								<TextInput secureTextEntry={true} onChangeText={(text) => {
									this.setState({ password: text })
								}} style={styles.textInput} underlineColorAndroid="transparent" 
								autoCapitalize={"none"}/>
							</View>
							<View style={styles.pwdDivider}></View>
							<TouchableOpacity activeOpacity={0.6} onPress={() => this.login()}>
								<View style={styles.loginBtn}>
									<Text style={{ color: '#FFFFFF', fontSize: 16 }}>登录</Text>
								</View>
							</TouchableOpacity>
						</View>
					</View >
					{
						Utils.isEmpty(this.state.username) ? null : (
							<TouchableOpacity onPress={() => {
								this.changeAccount()
							}}>
								<Text style={styles.changeAccount}>切换账号</Text>
							</TouchableOpacity>
						)
					}
				</ScrollView>
			</View>
		);
	}
	static getDerivedStateFromProps(nextProps, prevState) {
		return {
			...prevState,
			token: nextProps.token
		}
	}
	changeAccount() {
		this.setState({ username: '' });
	}

	login() {
		let username = '';
		if (Utils.isEmpty(this.state.username)) {
			username = this.state.inputUsername;
		} else {
			username = this.state.username;
		}
		let password = this.state.password;
		// username = 'malilian'
		// password = 'menglu'
		if (Utils.isEmpty(username) || Utils.isEmpty(password)) {
			Toast.showShortCenter('用户名或密码不能为空');
			return;
		}
		// let url = 'http://app.yubo725.top/login2';
		let url = 'http://app.daicui.net/login';
		//let url = 'http://118.123.22.134/login';
		let formData = new FormData();
		formData.append('username', username);
		formData.append('password', password);
		formData.append('autoLogin', 'true');
		this.setState({ showProgress: true });
		// fetch(url, {method: 'POST', body: formData})
		fetch(url, {
			method: 'POST',
			body: JSON.stringify({ username: username, password: password, autoLogin: true }),
			headers: {
				'Content-Type': 'application/json'
			}
		})
			.then((res) => res.json())
			.then((json) => {
				this.setState({ showProgress: false });
				if (!Utils.isEmpty(json)) {
					if (json.code === 200) {
						// 登录服务器成功，再登录NIM的服务器
						let data = json.body;
						console.log('hello');
						
						console.log(data);
						this.props.tokenInit({ ...data })
						StorageUtil.set('tokeninfo', data);
						//tokeninfo
						if (data != null) {
							let userInfo = {
								username: username,
								nick: data.nickName,
								avatar: `http://app.daicui.net/${data.headImg}`
							};
							let key = 'userInfo-' + username;

							StorageUtil.set(key, { 'info': userInfo });


							// StorageUtil.set('uid', data.id,function() {
							//   console.log('set uid finish!');
							// });

							Toast.showShortCenter('登录聊天服务器...');
							this.registerHXListener();
							this.loginToHX(username, password);
						}
					} else {
						Toast.showShortCenter(json.msg);
					}
				} else {
					Toast.showShortCenter('登录失败');
				}
			}).catch((e) => {
				this.setState({ showProgress: false });
				Toast.showShortCenter('网络请求出错: ' + e);
			});
	}

	loginToHX(username, password) {
		// 登录环信聊天服务器
		this.loginUsername = username;
		this.loginPassword = password;
		if (WebIM.conn.isOpened()) {
			WebIM.conn.close('logout');
		}
		// 下面调用成功后，会回调SplashScreen中注册的listener
		WebIM.conn.open({
			apiUrl: WebIM.config.apiURL,
			user: username,
			pwd: password,
			appKey: WebIM.config.appkey
		});
	}

	registerHXListener() {
		WebIM.conn.listen({
			// xmpp连接成功
			onOpened: (msg) => {
				// 登录环信服务器成功后回调这里，关闭当前页面并跳转到HomeScreen
				Toast.showShortCenter('登录成功');
				StorageUtil.set('hasLogin', { 'hasLogin': true });
				StorageUtil.set('username', { 'username': this.loginUsername });
				StorageUtil.set('password', { 'password': this.loginPassword });
				const resetAction = NavigationActions.reset({
					index: 0,
					actions: [
						NavigationActions.navigate({ routeName: 'Home' })
					]
				});
				this.props.navigation.dispatch(resetAction);
			},
			// 各种异常
			onError: (error) => {
				Toast.showShortCenter('登录聊天服务器出错');
				console.log('onError: ' + JSON.stringify(error))
			},
			// 连接断开
			onClosed: (msg) => {
				// Toast.showShortCenter('与聊天服务器连接断开');
			},
		});
	}

	componentWillUnmount() {
		CountEmitter.removeListener('loginToHXSuccess', () => { });
	}
}

const mapStateToProps = (state) => ({
	token: state.token
})

const mapDispatchToProps = {
	tokenInit
}

export default connect(mapStateToProps, mapDispatchToProps)(LoginScreen)

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
	},
	content: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
	},
	pwdView: {
		flexDirection: 'column',
		alignItems: 'center',
		marginTop: 50,
	},
	textInput: {
		flex: 1
	},
	usernameText: {
		marginTop: 10,
		fontSize: Platform.OS=='ios'?FZ(20):16 ,
		textAlign: 'center'
	},
	pwdContainer: {
		flexDirection: 'row',
		height: 50,
		alignItems: 'center',
		marginLeft: 40,
		marginRight: 40,
	},
	pwdDivider: {
		width: width - 60,
		marginLeft: 30,
		marginRight: 30,
		height: 1,
		backgroundColor: '#00BC0C'
	},
	loginBtn: {
		width: width - 40,
		marginLeft: 20,
		marginRight: 20,
		marginTop: 50,
		height: 50,
		borderRadius: 3,
		backgroundColor: '#00BC0C',
		justifyContent: 'center',
		alignItems: 'center',
	},
	changeAccount: {
		fontSize: Platform.OS=='ios'?FZ(20):16 ,
		color: '#00BC0C',
		textAlign: 'center',
		marginBottom: 20,
		marginTop: 80
	}
});
