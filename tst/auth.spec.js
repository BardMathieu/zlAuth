function jwtMake(valid){
    // Header
    var oHeader = {alg: 'HS256', typ: 'JWT'};
// Payload
    var oPayload = {};
    var tNow     = KJUR.jws.IntDate.get('now');
    var tEnd     = valid ? KJUR.jws.IntDate.get('now + 1day') : KJUR.jws.IntDate.get('now') - 100000;
    oPayload.iss = "http://foo.com";
    oPayload.sub = "mailto:mike@foo.com";
    oPayload.nbf = tNow;
    oPayload.iat = tNow;
    oPayload.exp = tEnd;
    oPayload.jti = "id123456";
    oPayload.aud = "http://foo.com/employee";
// Sign JWT, password=616161
    var sHeader  = JSON.stringify(oHeader);
    var sPayload = JSON.stringify(oPayload);
    return KJUR.jws.JWS.sign("HS256", sHeader, sPayload, "616161");
}


describe('AuthService', function(){

    var zlAuth, $window, $localStorage;

    var authUrl      = 'https://MYAUTH.fr';
    var appId        = 'THISISMYAPPID';
    var loginRoute   = '/user/login';
    var refreshRoute = '/user/refresh/';


    beforeEach(function(){
        angular.module('90TechSAS.zlAuth.test', ['90TechSAS.zlAuth']);

        module('90TechSAS.zlAuth.test', function($provide, _zlAuthProvider_){
            _zlAuthProvider_.setAppId(appId)
                .setRootUrl(authUrl)
                .setLoginRoute(loginRoute)
                .setRefreshRoute(refreshRoute);

            $window       = {
                // now, $window.location.path will update that empty object
                location: {},
                // we keep the reference to window.document
                document: window.document
            };
            $localStorage = {};
            $provide.constant('$window', $window);
            $provide.constant('$localStorage', $localStorage);

        });
    });

    describe('with no token whatsoever', function(){

        beforeEach(function(){
            inject(function(_$timeout_){
                $timeout = _$timeout_;
            });
            inject(function(_zlAuth_){
                zlAuth = _zlAuth_;
            });
        });
        it('should disconnect ', function(){
            $timeout.flush();
            expect($window.location.href).toEqual(authUrl + loginRoute + '?client=' + appId);
        });
    });

    describe('after login with valid token', function(){

        var $location, $localStorage, $rootScope;
        var validToken = jwtMake(true);

        beforeEach(function(){
            inject(function(_$location_, _$localStorage_, _$rootScope_){
                $location     = _$location_;
                $localStorage = _$localStorage_;
                $rootScope    = _$rootScope_;
                _$location_.hash(validToken);
            });
            inject(function(_zlAuth_){
                zlAuth = _zlAuth_;
            });
        });

        it('should have set a token', function(){
            expect($location.hash()).toEqual(validToken);
        });

        it('should save the token in localStorage', function(){
            $rootScope.$digest();
            expect($localStorage.accessToken).toEqual(validToken);
        });

        it('should empty the location hash', function(){
            $rootScope.$digest();
            expect($location.hash()).toBeFalsy();
        });

        it('should provide with the token', function(done){
            zlAuth.getToken().then(function(tkn){
                expect(tkn).toEqual(validToken);
                done();
            });
            $rootScope.$digest();
        });
    });

    describe('after login with Invalid token', function(){

        var $location, $localStorage, $rootScope, $httpBackend, $timeout;
        var invalidToken = jwtMake(false);
        var validToken   = jwtMake(true);

        beforeEach(function(){
            inject(function(_$location_, _$localStorage_, _$rootScope_, _$httpBackend_, _$timeout_){

                $location     = _$location_;
                $localStorage = _$localStorage_;
                $rootScope    = _$rootScope_;
                $httpBackend  = _$httpBackend_;
                $timeout      = _$timeout_;
                _$location_.hash(invalidToken);

            });
            inject(function(_zlAuth_){
                zlAuth = _zlAuth_;
            });
        });


        afterEach(function(){
            $httpBackend.verifyNoOutstandingExpectation()
        });

        it('should try to refresh', function(){
            $httpBackend
                .expectGET(authUrl + refreshRoute + invalidToken).respond(undefined);
            $rootScope.$digest();
        });


        it('should disconnect if refresh fails', function(){
            $httpBackend
                .expectGET(authUrl + refreshRoute + invalidToken).respond(400, '');
            $httpBackend.flush();
            $timeout.flush();
            expect($window.location.href).toEqual(authUrl + loginRoute + '?client=' + appId);
        });

        it('should provide with a valid token if refresh is successful', function(){
            $httpBackend
                .expectGET(authUrl + refreshRoute + invalidToken).respond(
                {expireAt: 1111111, token: validToken}
            );

            zlAuth.getToken().then(function(tkn){
                expect(tkn).toEqual(validToken);
            });
            $httpBackend.flush();
        });


    });

    describe('with valid token in localStorage', function(){

        var $location, $localStorage, $rootScope;
        var validToken = jwtMake(true);

        beforeEach(function(){
            inject(function(_$location_, _$localStorage_, _$rootScope_){
                $location                 = _$location_;
                $localStorage             = _$localStorage_;
                $rootScope                = _$rootScope_;
                $localStorage.accessToken = validToken;
                //_$location_.hash(validToken);
            });
            inject(function(_zlAuth_){
                zlAuth = _zlAuth_;
            });
        });

        it('should save the token in localStorage', function(){
            $rootScope.$digest();
            expect($localStorage.accessToken).toEqual(validToken);
        });

        it('should empty the location hash', function(){
            $rootScope.$digest();
            expect($location.hash()).toBeFalsy();
        });

        it('should provide with the token', function(done){
            $rootScope.$digest();
            zlAuth.getToken().then(function(tkn){
                expect(tkn).toEqual(validToken);
                done();
            });
            $rootScope.$digest();
        }, 1000);
    });

    describe('with invalid token in localStorage', function(){

        var $location, $localStorage, $rootScope, $httpBackend, $timeout;
        var invalidToken = jwtMake(false);
        var validToken   = jwtMake(true);

        beforeEach(function(){
            inject(function(_$location_, _$localStorage_, _$rootScope_, _$httpBackend_, _$timeout_){

                $location                 = _$location_;
                $localStorage             = _$localStorage_;
                $rootScope                = _$rootScope_;
                $httpBackend              = _$httpBackend_;
                $timeout                  = _$timeout_;
                $localStorage.accessToken = invalidToken;

            });
            inject(function(_zlAuth_){
                zlAuth = _zlAuth_;
            });
        });


        afterEach(function(){
            $httpBackend.verifyNoOutstandingExpectation()
        });

        it('should try to refresh', function(){
            $httpBackend
                .expectGET(authUrl + refreshRoute + invalidToken).respond(undefined);
            $rootScope.$digest();
        });


        it('should disconnect if refresh fails', function(){
            $httpBackend
                .expectGET(authUrl + refreshRoute + invalidToken).respond(400, '');
            $httpBackend.flush();
            $timeout.flush();
            expect($window.location.href).toEqual(authUrl + loginRoute + '?client=' + appId);

        });

        it('should provide with a valid token if refresh is successful', function(){
            $httpBackend
                .expectGET(authUrl + refreshRoute + invalidToken).respond(
                {expireAt: 1111111, token: validToken}
            );

            zlAuth.getToken().then(function(tkn){
                expect(tkn).toEqual(validToken);
            });
            $httpBackend.flush();
        });


        it('should not deadlock', function(){
            $httpBackend
                .expectGET(authUrl + refreshRoute + invalidToken).respond(
                {expireAt: 1111111, token: validToken}
            );

            zlAuth.getToken().then(function(tkn){
                expect(tkn).toEqual(validToken);
            });
            zlAuth.getToken().then(function(tkn){
                expect(tkn).toEqual(validToken);
            });

            $httpBackend.flush();

        });
    });


})
;