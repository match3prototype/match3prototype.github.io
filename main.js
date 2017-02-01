window.onload = function(){
    cc.game.onStart = function(){
        //load resources
        cc.LoaderScene.preload(["res/Blue.png","res/Brown.png","res/Green.png","res/Pink.png","res/Purple.png","res/Red.png","res/Yellow.png"], function(){
            cc.director.runScene(new MenuScene());
        }, this);
    };
    cc.game.run("gameCanvas");
};

//메뉴 화면
var MenuScene = cc.Scene.extend({
    ctor: function () {
        this._super();
        this.init();

        var size = cc.director.getWinSize();

        var layer_bg = new cc.LayerColor(cc.color(0, 0, 0, 255));
        layer_bg.setContentSize(size.width, size.height);
        layer_bg.x = 0;
        layer_bg.y = 0;
        this.addChild(layer_bg, 0);

        var label_title = cc.LabelTTF.create("Match-3 Game", "Arial", 50);
        label_title.setPosition(size.width / 2, size.height / 2 + 100);
        this.addChild(label_title, 1);

        var menu_item_play = new cc.MenuItemFont("Play", this.onPushGameScene, this);
        var menu = new cc.Menu(menu_item_play);
        menu.setPosition(size.width / 2, size.height / 2 - 50);
        this.addChild(menu, 1);
    },

    onPushGameScene: function(){
        var scene = new GameScene();
        cc.director.pushScene(scene);
    }
});

//게임 화면
var GameScene = cc.Scene.extend({
    ctor: function () {
        this._super();
        this.init();

        var layer = new GameLayer();
        this.addChild(layer);
    }
});

//게임 레이어
var GameLayer = cc.Layer.extend({
    _board: null,
    _winSize: null,
    _bTouchStarted: null,
    _gestureStartBoardX: null,
    _gestureStartBoardY: null,
    _numOfSlidingObjects: 0,
    _numOfFallingObjects: 0,
    ctor: function(){
        this._super();
        this.init();

        var size = cc.director.getWinSize();

        var layer_bg = new cc.LayerColor(cc.color(0, 0, 0, 255));
        layer_bg.setContentSize(size.width, size.height);
        layer_bg.x = 0;
        layer_bg.y = 0;
        this.addChild(layer_bg, 0);

        this.startGame();

        var eventListener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: this.onTouchBegan, 
            onTouchMoved: this.onTouchMoved,
            onTouchEnded: this.onTouchEnded});

        cc.eventManager.addListener(eventListener, this);
    },

    onTouchBegan: function(touch, event){

        if(this._numOfFallingObjects > 0 || this._numOfSlidingObjects > 0)
            return false;

        var target = event.getCurrentTarget();

        if (target._bTouchStarted == false){
            var point = touch.getLocationInView();
            
            target._gestureStartBoardX = Common.computeBoardX(point.x);
            target._gestureStartBoardY = Common.computeBoardY(point.y);

            if (target._board[target._gestureStartBoardX][target._gestureStartBoardY] == null)
                return false;

            target._bTouchStarted = true;
            return true;
        }
    },

    onTouchMoved: function(touch, event){
        var target = event.getCurrentTarget();

        if (target._bTouchStarted){            
            var point = touch.getLocationInView();
            
            var boardX = Common.computeBoardX(point.x);
            var boardY = Common.computeBoardY(point.y);
            
            if (target._board[boardX][boardY] == null)
                return;
            
            if (target._gestureStartBoardX != boardX || target._gestureStartBoardY != boardY){
                if (target.isAdjacent(target._gestureStartBoardX, target._gestureStartBoardY, boardX, boardY)){
                    
                    target.swapObjects(target._gestureStartBoardX, target._gestureStartBoardY, boardX, boardY);
                }
                
                target._bTouchStarted = false;
            }
        }
    },

    onTouchEnded: function(touch, event){
        var target = event.getCurrentTarget();
        if (target._bTouchStarted) {
            target._bTouchStarted = false;
        }
    },

    startGame: function(){
        this._numOfSlidingObjects = 0;
        this._numOfFallingObjects = 0;

        this._combo = 0;
        this._comboTime = 0;

        this._board = new Array(Common.COLUMN_COUNT);
        for (var i = 0; i < Common.COLUMN_COUNT; i++){
            this._board[i] = new Array(Common.MAX_ROW_COUNT);
        }


        for (var x = 0; x < Common.COLUMN_COUNT; ++x){
            for (var y = Common.START_ROW; y < Common.START_ROW + Common.ROW_COUNT; ++y){
                var gameObject = null;
                do {
                    var type = Math.floor(Math.random()*Common.TYPE_COUNT);

                    if (gameObject != null){
                        delete gameObject;
                        this._board[x][y] = null;
                    }

                    gameObject = new GameObject(Common.OBJECT_TYPE[type],type);

                    this._board[x][y] = gameObject;
                }
                while (this.isStreak(x,y));

                gameObject.setAnchorPoint(cc.p(0,0));
                gameObject.setPosition(Common.computeXY(x,y));
                gameObject.setTargetBoardX(x);
                gameObject.setTargetBoardY(y);
                gameObject.setGameLayer(this);

                this.addChild(gameObject, 1);
            }
        }
        this._bTouchStarted = false;
    },

    isStreak: function(x, y){
        return this.streakHorz(x,y) > 2 || this.streakVert(x,y) > 2;
    },

    streakHorz: function(x, y){
        if (x < 0 || x >= Common.COLUMN_COUNT)
            return 0;

        if (y < 0 || y >= Common.START_ROW + Common.ROW_COUNT)
            return 0;

        var currentGameObject = this._board[x][y];
        if (currentGameObject == null)
            return 0;

        var streak = 1;
        var temp = x;

        while (this.checkType(currentGameObject.getType(), temp - 1, y)){
            --temp;
            ++streak;
        }

        temp = x;

        while (this.checkType(currentGameObject.getType(), temp + 1, y)){
            ++temp;
            ++streak;
        }

        return streak;
    },

    streakVert: function(x, y){
        if (x < 0 || x >= Common.COLUMN_COUNT)
            return 0;

        if (y < 0 || y >= Common.START_ROW + Common.ROW_COUNT)
            return 0;

        var currentGameObject = this._board[x][y];
        if (currentGameObject == null)
            return 0;

        var streak = 1;
        var temp = y;

        while (this.checkType(currentGameObject.getType(), x, temp - 1)){
            --temp;
            ++streak;
        }

        temp = y;

        while (this.checkType(currentGameObject.getType(), x, temp + 1)){
            ++temp;
            ++streak;
        }

        return streak;
    },

    checkType: function(type, x, y){
        if (x < 0 || x >= Common.COLUMN_COUNT)
            return 0;

        if (y < 0 || y >= Common.START_ROW + Common.ROW_COUNT)
            return 0;

        if (this._board[x][y] == null)
            return false;

        return type == this._board[x][y].getType();
    },

    isAdjacent: function(x1, y1, x2, y2){
        return (Math.abs(x1 - x2) + Math.abs(y1 - y2)) == 1;
    },

    swapObjects: function(x1, y1, x2, y2, rollback = false){
        this._numOfSlidingObjects = 2;

        var temp = this._board[x1][y1];

        this._board[x1][y1] = this._board[x2][y2];
        this._board[x2][y2] = temp;

        this._board[x1][y1].setTargetBoardX(x1);
        this._board[x1][y1].setTargetBoardY(y1);
        this._board[x2][y2].setTargetBoardX(x2);
        this._board[x2][y2].setTargetBoardY(y2);

        if (rollback){
            var gameObject = this._board[x1][y1];
            gameObject.rollback();

            gameObject = this._board[x2][y2];
            gameObject.rollback();
        }
        else {
            this._board[x1][y1].processSliding();
            this._board[x2][y2].processSliding();
        }
    },

    removeObject: function(x, y){
        var currentType = this._board[x][y].getType();
        var temp;

        var removedObjects = [];

        var gameObject = this._board[x][y];
        removedObjects.push(gameObject);

        if (this.streakHorz(x, y) > 2){
            temp = x;

            while (this.checkType(currentType, temp - 1, y)){
                gameObject = this._board[temp - 1][y];
                removedObjects.push(gameObject);
                --temp;
            }

            temp = x;

            while (this.checkType(currentType, temp + 1, y)){
                gameObject = this._board[temp + 1][y];
                removedObjects.push(gameObject);
                ++temp;
            }
        }

        if (this.streakVert(x, y) > 2){
            temp = y;

            while (this.checkType(currentType, x, temp - 1)){
                gameObject = this._board[x][temp - 1];
                removedObjects.push(gameObject);
                --temp;
            }

            temp = y;

            while (this.checkType(currentType, x, temp + 1)){
                gameObject = this._board[x][temp + 1];
                removedObjects.push(gameObject);
                ++temp;
            }
        }

        for (var i = 0; i < removedObjects.length; ++i){
            var removedGameObject = removedObjects[i];
            if (removedGameObject){
                var boardX = removedGameObject.getTargetBoardX();
                var boardY = removedGameObject.getTargetBoardY();
                this._board[boardX][boardY] = null;

                this.removeChild(removedGameObject, true);
            }
        }


    },

    checkStreaks: function(){   //sunu 여기에 processFalling 무조건 수행안되게 조건 추가
        var bIsStreak = false;
        for (var y = Common.START_ROW + Common.ROW_COUNT - 1; y >= Common.START_ROW; --y){
            for (var x = 0; x < Common.COLUMN_COUNT; ++x){
                var gameObject = this._board[x][y];
                if (gameObject != null){
                    if (this.isStreak(x, y)){
                        this.removeObject(x, y);
                        bIsStreak = true;
                    }
                }
            }
        }
        if (bIsStreak)
            this.processFalling();
    },

    processFalling: function(){
        this._numOfFallingObjects = 0;
        
        for (var x = 0; x < Common.COLUMN_COUNT; ++x){
            var fallingStep = 0;

            for (var y = Common.START_ROW; y < Common.ROW_COUNT; ++y){
                var gameObject = this._board[x][y];
                if (gameObject == null){
                    var k = 0;

                    var toBeFallingObject = null;

                    for (k = y; k < Common.ROW_COUNT; ++k){
                        toBeFallingObject = this._board[x][k];
                        if (toBeFallingObject != null)
                            break;
                    }

                    if (toBeFallingObject != null){
                        this._board[x][k].setTargetBoardX(x);
                        this._board[x][k].setTargetBoardY(y);

                        this._board[x][k].processFalling();

                        this._board[x][y] = this._board[x][k];
                        this._board[x][k] = null;

                        this._numOfFallingObjects++;
                    }
                    else
                    {
                        var targetY = Common.ROW_COUNT - 1;

                        var type = Math.floor(Math.random()*Common.TYPE_COUNT);

                        toBeFallingObject = new GameObject(Common.OBJECT_TYPE[type],type);

                        toBeFallingObject.setTargetBoardX(x);
                        toBeFallingObject.setTargetBoardY(y);
                        toBeFallingObject.setGameLayer(this);

                        toBeFallingObject.setAnchorPoint(cc.p(0, 0));
                        toBeFallingObject.setPosition(Common.computeXY(x, targetY + fallingStep));

                        this.addChild(toBeFallingObject, 1);

                        toBeFallingObject.processFalling();

                        this._board[x][y] = toBeFallingObject;

                        ++fallingStep;
                        
                        this._numOfFallingObjects++;
                    }
                }
            }
        }
    },

    fallingFinished: function(){
        this._numOfFallingObjects--;
        if (this._numOfFallingObjects == 0){
            this.checkStreaks();
        }
    },

    slidingFinished: function(x1, y1, x2, y2){
        --this._numOfSlidingObjects;
        if (this._numOfSlidingObjects == 0){
            if (this.isStreak(x1, y1) || this.isStreak(x2, y2)){
                var bRemoved1 = false;
                var bRemoved2 = false;
                
                if (this.isStreak(x1, y1)){
                    bRemoved1 = true;
                    this.removeObject(x1, y1);
                }
                
                if (this.isStreak(x2, y2)){
                    bRemoved2 = true;
                    this.removeObject(x2, y2);
                }
                
                if (bRemoved1 || bRemoved2){
                    this.processFalling();
                }
            }
            else
            {
                this.swapObjects(x1, y1, x2, y2, true);
            }
        }
    }
});


var GameObject = cc.Sprite.extend({
    _type: null,
    _prevBoardX: null,
    _prevBoardY: null,
    _targetBoardX: null,
    _targetBoardY: null,
    _gameLayer: null,
    ctor: function(texture, type){
        this._super(texture);
        this._type = type;
    },
    getType: function(){
        return this._type;
    },
    setType: function(type){
        this._type = type;
    },
    getTargetBoardX: function(){
        return this._targetBoardX;
    },
    setTargetBoardX: function(x){
        this._targetBoardX = x;
    },
    getTargetBoardY: function(){
        return this._targetBoardY;
    },
    setTargetBoardY: function(y){
        this._targetBoardY = y;
    },
    processSliding: function(){
        var position = this.getPosition();

        this._prevBoardX = Common.computeBoardX(position.x);
        
        this._prevBoardY = Common.computeBoardY(position.y);

        var targetPosition = Common.computeXY(this._targetBoardX, this._targetBoardY);

        var moveBy = cc.MoveBy.create(0.1, cc.p(targetPosition.x - position.x, targetPosition.y - position.y));

        var action = cc.Sequence.create(moveBy, cc.callFunc(this.slidingCompleteHandler,this)); //sunu
        this.runAction(action);
    },
    slidingCompleteHandler: function(){
        var x1 = this._prevBoardX;
        var y1 = this._prevBoardY;
        var x2 = this._targetBoardX;
        var y2 = this._targetBoardY;
        this._gameLayer.slidingFinished(x1, y1, x2, y2);
    },
    rollback: function(){
        var targetPosition = Common.computeXY(this._prevBoardX, this._prevBoardY);
        var position = this.getPosition();

        var moveBy = cc.MoveBy.create(0.1, cc.p(targetPosition.x - position.x, targetPosition.y - position.y));
        var action = cc.Sequence.create(moveBy);
        this.runAction(action);
    },
    processFalling: function(){
        var position = this.getPosition();

        this._prevBoardX = Common.computeBoardX(position.x);
        this._prevBoardY = Common.computeBoardY(position.y);

        var targetPosition = Common.computeXY(this._targetBoardX, this._targetBoardY);

        var fallingStepCount = this._prevBoardY - this._targetBoardY;

        var moveBy = cc.MoveBy.create(0.1 * fallingStepCount, cc.p(targetPosition.x - position.x, targetPosition.y - position.y));
        var action = cc.Sequence.create(moveBy, cc.callFunc(this.fallingCompleteHandler,this));
        this.runAction(action);
    },
    fallingCompleteHandler: function(){
        this._gameLayer.fallingFinished();
    },
    setGameLayer: function(gameLayer){
        this._gameLayer = gameLayer;
    }
});


var Common = {  //static
    START_ROW: 0,
    ROW_COUNT: 8,
    COLUMN_COUNT: 8,
    MAX_ROW_COUNT: 8,
    TYPE_COUNT: 6,
    OBJECT_WIDTH: 96,
    OBJECT_HEIGHT: 96,
    OBJECT_TYPE:["res/Blue.png","res/Brown.png","res/Green.png","res/Pink.png","res/Purple.png","res/Red.png","res/Yellow.png"],
    computeX: function(x){
        return Math.floor(x * this.OBJECT_WIDTH);
    },
    computeY: function(y){
        return Math.floor(y * this.OBJECT_HEIGHT);
    },
    computeXY: function(x, y){  //인덱스로 블럭 위치 설정
        return cc.p(this.computeX(x),this.computeY(y));
    },
    computeBoardX: function(x){ //터치한 좌표의 블럭 인덱스 리턴
        return Math.floor(x / Math.floor(this.OBJECT_WIDTH));
    },
    computeBoardY: function(y){ //터치한 좌표의 블럭 인덱스 리턴
        return Math.floor(y / Math.floor(this.OBJECT_HEIGHT));
    }
};
