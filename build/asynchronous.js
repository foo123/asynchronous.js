/**
*
*   Asynchronous.js
*   @version: 0.3
*
*   Simple JavaScript class to manage asynchronous, parallel, sequential and interleaved tasks
*   https://github.com/foo123/asynchronous.js
*
**/!function ( root, name, deps, factory, undef ) {

    "use strict";
    var isNode = ("undefined" !== typeof global && "[object global]" === {}.toString.call(global)),
        isBrowser = (!isNode && "undefined" !== typeof navigator ), 
        isWorker = ("function" === typeof importScripts && navigator instanceof WorkerNavigator),
        A = Array, AP = A.prototype
    ;
    // Get current filename/path
    var getCurrentPath = function() {
            var file = null;
            if ( isNode ) 
            {
                // http://nodejs.org/docs/latest/api/globals.html#globals_filename
                // this should hold the current file in node
                file = __filename;
                return { path: __dirname, file: __filename };
            }
            else if ( isWorker )
            {
                // https://developer.mozilla.org/en-US/docs/Web/API/WorkerLocation
                // this should hold the current url in a web worker
                file = self.location.href;
            }
            else if ( isBrowser )
            {
                // get last script (should be the current one) in browser
                var scripts;
                if ((scripts = document.getElementsByTagName('script')) && scripts.length) 
                    file  = scripts[scripts.length - 1].src;
            }
            
            if ( file )
                return { path: file.split('/').slice(0, -1).join('/'), file: file };
            return { path: null, file: null };
        },
        thisPath = getCurrentPath(),
        makePath = function(base, dep) {
            if ( isNode )
            {
                //return require('path').join(base, dep);
                return dep;
            }
            if ( "." == dep.charAt(0) ) 
            {
                base = base.split('/');
                dep = dep.split('/'); 
                var index = 0, index2 = 0, i, l = dep.length, l2 = base.length;
                
                for (i=0; i<l; i++)
                {
                    if ( /^\.\./.test( dep[i] ) )
                    {
                        index++;
                        index2++;
                    }
                    else if ( /^\./.test( dep[i] ) )
                    {
                        index2++;
                    }
                    else
                    {
                        break;
                    }
                }
                index = ( index >= l2 ) ? 0 : l2-index;
                dep = base.slice(0, index).concat( dep.slice( index2 ) ).join('/');
            }
            return dep;
        }
    ;
    
    //
    // export the module in a umd-style generic way
    deps = ( deps ) ? [].concat(deps) : [];
    var i, dl = deps.length, ids = new A( dl ), paths = new A( dl ), fpaths = new A( dl ), mods = new A( dl ), _module_, head;
        
    for (i=0; i<dl; i++) { ids[i] = deps[i][0]; paths[i] = deps[i][1]; fpaths[i] = /\.js$/i.test(paths[i]) ? makePath(thisPath.path, paths[i]) : makePath(thisPath.path, paths[i]+'.js'); }
    
    // node, commonjs, etc..
    if ( "object" === typeof( module ) && module.exports ) 
    {
        if ( undef === module.exports[name] )
        {
            for (i=0; i<dl; i++)  mods[i] = module.exports[ ids[i] ] || require( fpaths[i] )[ ids[i] ];
            _module_ = factory.apply(root, mods );
            // allow factory just to add to existing modules without returning a new module
            module.exports[ name ] = _module_ || 1;
        }
    }
    
    // amd, etc..
    else if ( "function" === typeof( define ) && define.amd ) 
    {
        define( ['exports'].concat( paths ), function( exports ) {
            if ( undef === exports[name] )
            {
                var args = AP.slice.call( arguments, 1 ), dl = args.length;
                for (var i=0; i<dl; i++)   mods[i] = exports[ ids[i] ] || args[ i ];
                _module_ = factory.apply(root, mods );
                // allow factory just to add to existing modules without returning a new module
                exports[ name ] = _module_ || 1;
            }
        });
    }
    
    // web worker
    else if ( isWorker ) 
    {
        for (i=0; i<dl; i++)  
        {
            if ( !self[ ids[i] ] ) importScripts( fpaths[i] );
            mods[i] = self[ ids[i] ];
        }
        _module_ = factory.apply(root, mods );
        // allow factory just to add to existing modules without returning a new module
        self[ name ] = _module_ || 1;
    }
    
    // browsers, other loaders, etc..
    else
    {
        if ( undef === root[name] )
        {
            /*
            for (i=0; i<dl; i++)  mods[i] = root[ ids[i] ];
            _module_ = factory.apply(root, mods );
            // allow factory just to add to existing modules without returning a new module
            root[name] = _module_ || 1;
            */
            
            // load javascript async using <script> tags in browser
            var loadJs = function(url, callback) {
                head = head || document.getElementsByTagName("head")[0];
                var done = 0, script = document.createElement('script');
                
                script.type = 'text/javascript';
                script.language = 'javascript';
                script.onload = script.onreadystatechange = function( ) {
                    if (!done && (!script.readyState || script.readyState == 'loaded' || script.readyState == 'complete'))
                    {
                        done = 1;
                        script.onload = script.onreadystatechange = null;
                        head.removeChild( script );
                        script = null;
                        if ( callback )  callback();
                    }
                }
                // load it
                script.src = url;
                head.appendChild( script );
            };

            var loadNext = function(id, url, callback) { 
                    if ( !root[ id ] ) 
                        loadJs( url, callback ); 
                    else
                        callback();
                },
                continueLoad = function( i ) {
                    return function() {
                        if ( i < dl )  mods[ i ] = root[ ids[ i ] ];
                        if ( ++i < dl )
                        {
                            loadNext( ids[ i ], fpaths[ i ], continueLoad( i ) );
                        }
                        else
                        {
                            _module_ = factory.apply(root, mods );
                            // allow factory just to add to existing modules without returning a new module
                            root[ name ] = _module_ || 1;
                        }
                    };
                }
            ;
            if ( dl ) 
            {
                loadNext( ids[ 0 ], fpaths[ 0 ], continueLoad( 0 ) );
            }
            else
            {
                _module_ = factory.apply(root, mods );
                // allow factory just to add to existing modules without returning a new module
                root[ name ] = _module_ || 1;
            }
        }
    }


}(  /* current root */          this, 
    /* module name */           "Asynchronous",
    /* module dependencies */   null, 
    /* module factory */        function(  ) {

        /* custom exports object */
        var EXPORTS = {};
        
        /* main code starts here */

/**
*
*   Asynchronous.js
*   @version: 0.3
*
*   Simple JavaScript class to manage asynchronous, parallel, sequential and interleaved tasks
*   https://github.com/foo123/asynchronous.js
*
**/
!function( root, exports, undef ) {

    "use strict";
    
    var FP = Function.prototype, OP = Object.prototype, AP = Array.prototype
        ,slice = FP.call.bind( AP.slice ), toString = FP.call.bind( OP.toString )
        ,UNDEFINED = undef, UNKNOWN = 0, NODE = 1, BROWSER = 2
        ,DEFAULT_INTERVAL = 60, NONE = 0, INTERLEAVED = 1, LINEARISED = 2, PARALLELISED = 3, SEQUENCED = 4
        ,isNode = ("undefined" !== typeof( global )) && ('[object global]' === toString( global ))
        // http://nodejs.org/docs/latest/api/all.html#all_cluster
        ,isNodeProcess = !!(isNode && process.env.NODE_UNIQUE_ID)
        ,isBrowser = !isNode && ("undefined" !== typeof( navigator ))
        ,isWebWorker = !isNode && ("function" === typeof( importScripts )) && (navigator instanceof WorkerNavigator)
        ,supportsMultiThread = isNode || ("function" === typeof( Worker ))
        ,isThread = isNodeProcess || isWebWorker
        ,Thread, numProcessors = isNode ? require('os').cpus( ).length : 4
        ,fromJSON = JSON.parse, toJSON = JSON.stringify ,onMessage
        
        ,curry = function( f, a ) { return function( ){return f(a);}; }
        
        ,URL = root.webkitURL || root.URL || null
        ,blobURL = function( src ) {
            if ( URL )
                return URL.createObjectURL( new Blob( [ src || '' ], { type: "text/javascript" }) );
            return src;
        }
        
        // Get current filename/path
        ,path = function( ) {
            var file = null, scripts;
            if ( isNode ) 
            {
                // http://nodejs.org/docs/latest/api/globals.html#globals_filename
                // this should hold the current file in node
                return { path: __dirname, file: __filename };
            }
            else if ( isWebWorker )
            {
                // https://developer.mozilla.org/en-US/docs/Web/API/WorkerLocation
                // this should hold the current url in a web worker
                file = self.location.href;
            }
            else if ( isBrowser && (scripts = document.getElementsByTagName('script')) && scripts.length )
            {
                // get last script (should be the current one) in browser
                file  = scripts[ scripts.length - 1 ].src;
            }
            
            return file 
                    ? { path: file.split('/').slice(0, -1).join('/'), file: ''+file }
                    : { path: null, file: null }
            ;
        }
        
        ,thisPath = path( )
        
        ,notThisPath = function( path ) {
            return path && path.length && path !== thisPath.file;
        }
    ;
    
    //console.log([isNode, isNodeProcess, isBrowser, isWebWorker, supportsMultiThread]);
    
    if ( isWebWorker )
    {
        onMessage = function( handler ) {
            if ( handler )
            {
                onmessage = handler;
            }
        };
    }
    else if ( isNodeProcess )
    {
        onMessage = function( handler ) {
            if ( handler )
            {
                process.on('message', function( msg ) {
                    handler( fromJSON(msg) );
                });
            }
        };
    }
    else
    {
        onMessage = function( handler ) { };
    }
        
    if ( isNode )
    {
        // adapted from https://github.com/adambom/parallel.js
        var fs = require('fs'), ps = require( 'child_process' );
        
        root.close = function( ) { process.exit( ); };
        root.postMessage = function( data ) { process.send( toJSON( {data: data} ) ); };
        root.importScripts = function( scripts )  {
            if ( scripts )
            {
                scripts = scripts.split(',');
                var i=0, src, ok;
                while ( i < scripts.length )
                {
                    ok = true;
                    try {
                        src = fs.readFileSync( scripts[i++] );
                        eval( src );
                    } catch ( e ) {
                        ok = e;
                    }
                    if ( true !== ok )
                    {
                        throw ok;
                        //break;
                    }
                }
            }
        };
            
        Thread = function( path ) {
            var self = this;
            self.process = ps.fork( path );
            self.process.on('message', function( msg ) {
                if ( self.onmessage ) self.onmessage( fromJSON( msg ) );
            });
            self.process.on('error', function( err ) {
                if ( self.onerror ) self.onerror( err );
            });
        };
        Thread.prototype = {
            constructor: Thread,
            process: null,
            
            onmessage: null,
            onerror: null,

            postMessage: function( data ) {
                if ( this.process )
                    this.process.send( toJSON( {data: data} ) );
                return this;
            },

            terminate: function( ) {
                if ( this.process )
                {
                    this.process.kill( );
                    this.process = null;
                }
                return this;
            }
        };
    }
    else
    {
        Thread = Worker;
    }
    
    // Task class/combinator
    var Task = function( task ) {
        if ( task instanceof Task ) return task;
        if ( !(this instanceof Task) ) return new Task( task );
        if ( 1 > arguments.length ) task = null;
        
        var self = this, async = null, 
            onComplete = null, run_once = false,
            times = false, loop = false, recurse = false,
            until = false, untilNot = false, 
            loopObject = null, repeatCounter = 0,
            repeatIncrement = 1, repeatTimes = null,
            repeatUntil = null, repeatUntilNot = null,
            lastResult = undef
        ;
        
        var run = function( ) {
            lastResult = task( );
            run_once = true;
            return lastResult;
        };
        
        self.task = function( t ) {
            task = t;
            return self;
        };
        
        self.queue = function( q ) {
            if ( arguments.length )
            {
                async = q;
                return self;
            }
            return async;
        };
        
        self.canRun = function( ) {
            if ( !task ) return false;
            if ( run_once && !times && !loop && !recurse && !until && !untilNot ) return false;
            if ( (times || loop) && repeatCounter >= repeatTimes ) return false;
            if ( loop && !loopObject ) return false;
            if ( (recurse || until) && lastResult === repeatUntil ) return false;
            return true;
        };
        
        self.run = run;
        
        self.iif = function( cond, task_if_true, else_task ) {
            if ( cond )
            {
                task = task_if_true;
            }
            else if ( arguments.length > 2 )
            {
                task = else_task;
            }
            return self;
        };
        
        self.until = function( result ) {
            lastResult = undef;
            loopObject = null;
            repeatUntil = result;
            until = true;
            untilNot = false;
            times = false;
            loop = false;
            recurse = false;
            self.run = run;
            return self;
        };
        
        self.untilNot = function( result ) {
            lastResult = undef;
            loopObject = null;
            repeatUntilNot = result;
            untilNot = true;
            until = false;
            times = false;
            loop = false;
            recurse = false;
            self.run = run;
            return self;
        };
        
        self.times = function( numTimes, startCounter, increment ) {
            lastResult = undef;
            loopObject = null;
            repeatCounter = startCounter || 0;
            repeatIncrement = increment || 1;
            repeatTimes = numTimes;
            times = true;
            until = false;
            untilNot = false;
            loop = false;
            recurse = false;
            self.run = function( ) {
                var result;
                result = task( repeatCounter );
                repeatCounter += repeatIncrement;
                lastResult = result;
                run_once = true;
                return result;
            };
            return self;
        };
        
        self.loopOver = function( loopObj ) {
            lastResult = undef;
            loopObject = loopObj;
            repeatCounter = 0;
            repeatIncrement = 1;
            repeatTimes = loopObj ? (loopObj.length || 0) : 0;
            loop = true;
            until = false;
            untilNot = false;
            times = false;
            recurse = false;
            self.run = function( ) {
                var result;
                result = task( loopObject[ repeatCounter ], repeatCounter );
                repeatCounter++;
                lastResult = result;
                run_once = true;
                return result;
            };
            return self;
        };
        
        self.recurse = function( initialVal, finalVal ) {
            loopObject = null;
            lastResult = initialVal;
            repeatUntil = finalVal;
            recurse = true;
            until = false;
            untilNot = false;
            times = false;
            loop = false;
            self.run = function( ) {
                var result;
                result = task( lastResult );
                lastResult = result;
                run_once = true;
                return result;
            };
            return self;
        };
        
        self.isFinished = function( ) {
            var notfinished = !run_once || untilNot || until || times || loop || recurse;
            if ( notfinished && (until||recurse) && lastResult === repeatUntil ) notfinished = false;
            if ( notfinished && untilNot && lastResult !== repeatUntilNot ) notfinished = false;
            if ( notfinished && (times||loop) && repeatCounter >= repeatTimes ) notfinished = false;
            return !notfinished;
        };
        
        self.onComplete = function( callback ) {
            onComplete = callback || null;
            return self;
        };
        
        self.complete = function( ) {
            if ( onComplete && "function" === typeof(onComplete) ) onComplete( );
            return self;
        };
    };
    Task.iif = function( ) { var args = slice(arguments), T = new Task( ); return T.iif.apply( T, args ); };
    Task.until = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.until.apply( T, args ); };
    Task.untilNot = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.untilNot.apply( T, args ); };
    Task.times = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.times.apply( T, args ); };
    Task.loopOver = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.loopOver.apply( T, args ); };
    Task.recurse = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.recurse.apply( T, args ); };
    
    var Field = function( f ) {
        return new Function("o", "return o"+(f||'')+";");
    };
    
    // run tasks in parallel threads (eg. web workers, child processes)
    function runParallelised( scope ) 
    { 
        scope.$run_mode = PARALLELISED;
        return scope;
    }
    
    // serialize async-tasks that are non-blocking/asynchronous in a quasi-sequential manner
    function runLinearised( scope ) 
    { 
        var self = scope, queue = self.$queue, task;
        self.$run_mode = LINEARISED;
        if ( queue )
        {
            while ( queue.length && (!queue[ 0 ] || !queue[ 0 ].canRun( )) ) queue.shift( );
            // first task should call next tasks upon completion, via "in-place callback templates"
            if ( queue.length ) 
            {
                task = queue.shift( );
                task.run( );
                task.complete( );
            }
        }
        return self;
    }
    
    // interleave async-tasks in background in quasi-parallel manner
    function runInterleaved( scope ) 
    { 
        var self = scope, queue = self.$queue, task, index = 0;
        self.$run_mode = INTERLEAVED;
        if ( queue && queue.length )
        {
            while ( index < queue.length )
            {
                task = queue[ index ];
                
                if ( task && task.canRun( ) )
                {
                    task.run( );
                    if ( task.isFinished( ) )
                    {
                        queue.shift( );
                        task.complete( );
                    }
                    else
                    {
                        index++;
                    }
                }
                else
                {
                    queue.shift( );
                }
            }
            self.$timer = setTimeout( curry( runInterleaved, self ), self.$interval );
        }
        return self;
    }
    
    // run tasks in a quasi-asynchronous manner (avoid blocking the thread)
    function runSequenced( scope ) 
    {
        var self = scope, queue = self.$queue, task;
        self.$run_mode = SEQUENCED;
        if ( queue && queue.length )
        {
            task = queue[ 0 ];
            
            if ( task && task.canRun( ) )
            {
                task.run( );
                if ( task.isFinished( ) )
                {
                    queue.shift( );
                    task.complete( );
                }
            }
            else
            {
                queue.shift( );
            }
            self.$timer = setTimeout( curry( runSequenced, self ), self.$interval );
        }
        return self;
    }
    
    // manage tasks which may run in steps and tasks which are asynchronous
    var Asynchronous = exports.Asynchronous = function( interval ) {
        if ( !(this instanceof Asynchronous) ) return new Asynchronous( interval );
        var self = this;
        self.$interval = arguments.length ? parseInt(interval, 10) : DEFAULT_INTERVAL;
        self.$timer = null;
        self.$run_mode = NONE;
        self.$queue = [ ];
        
        if ( isThread )
        {
            self.$events = { };
            onMessage(function( evt ) {
                var event = evt.data.event, data = evt.data.data || null;
                if ( event && self.$events[event] )
                {
                    self.$events[ event ]( data );
                }
                else if ( 'dispose' === event )
                {
                    self.dispose( );
                    close( );
                }
            });
        }
    };
    Asynchronous.VERSION = "0.3";
    Asynchronous.Task = Task;
    Asynchronous.Field = Field;
    Asynchronous.MODE = { NONE: NONE, INTERLEAVE: INTERLEAVED, LINEAR: LINEARISED, PARALLEL: PARALLELISED, SEQUENCE: SEQUENCED };
    Asynchronous.Platform = { UNDEFINED: UNDEFINED, UNKNOWN: UNKNOWN, NODE: NODE, BROWSER: BROWSER };
    Asynchronous.supportsMultiThreading = function( ){ return supportsMultiThread; };
    //Asynchronous.isNode = function( ){ return isNode; };
    //Asynchronous.isBrowser = function( ){ return isBrowser; };
    Asynchronous.isPlatform = function( platform ){ 
        if ( NODE === platform ) return isNode;
        else if ( BROWSER === platform ) return isBrowser;
        return undef; 
    };
    //Asynchronous.isBrowserThread = function( ){ return isWebWorker; };
    //Asynchronous.isNodeThread = function( ){ return isNodeProcess; };
    Asynchronous.isThread = function( platform ){ 
        if ( NODE === platform ) return isNodeProcess;
        else if ( BROWSER === platform ) return isWebWorker;
        return isThread; 
    };
    Asynchronous.currentPath = path;
    /**
     * Provides requestAnimationFrame in a cross browser way.
     * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
     */
    Asynchronous.requestAnimationFrame = (function( window ) {
        return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
            /*window.*/setTimeout( callback, 1000 / 60 );
        };
    })( root );
    Asynchronous.prototype = {

        constructor: Asynchronous
        
        ,VERSION: Asynchronous.VERSION
        
        ,$interval: DEFAULT_INTERVAL
        ,$timer: null
        ,$queue: null
        ,$thread: null
        ,$events: null
        ,$run_mode: NONE
        
        ,dispose: function( ) {
            var self = this;
            self.unfork( );
            if ( self.$timer ) clearTimeout( self.$timer );
            self.$thread = null;
            self.$timer = null;
            self.$interval = null;
            self.$queue = null;
            self.$run_mode = NONE;
            return self;
        }
        
        ,empty: function( ) {
            var self = this;
            if ( self.$timer ) clearTimeout( self.$timer );
            self.$timer = null;
            self.$queue = [ ];
            self.$run_mode = NONE;
            return self;
        }
        
        ,interval: function( interval ) {
            if ( arguments.length ) 
            {
                this.$interval = parseInt(interval, 10);
                return this;
            }
            return this.$interval;
        }
        
        /*,sources: function( ) {
            var i, blobs = [ ], sources = slice( arguments );
            if ( sources.length )
            {
                for (i=0; i<sources.length; i++)
                {
                    if ( 'function' === typeof( sources[ i ] ) )
                    {
                        blobs.push( blobURL( sources[ i ].toString( ) ) );
                    }
                    else
                    {
                        blobs.push( blobURL( sources[ i ] ) );
                    }
                }
            }
            return blobs;
        }
        
        ,scripts: function( ) {
            var scripts = slice( arguments );
            return scripts;
        }*/
        
        // fork a new process/thread (e.g WebWorker, NodeProcess etc..)
        ,fork: function( component, imports ) {
            var self = this, thread, msgLog, msgErr;
            
            if ( !self.$thread )
            {
                if ( !supportsMultiThread )
                {
                    self.$thread = null;
                    throw new Error('Asynchronous: Multi-Threading is NOT supported!');
                    return self;
                }
                
                if ( isNode )
                {
                    msgLog = 'Asynchronous: Thread (Process): ';
                    msgErr = 'Asynchronous: Thread (Process) Error: ';
                }
                else
                {
                    msgLog = 'Asynchronous: Thread (Worker): ';
                    msgErr = 'Asynchronous: Thread (Worker) Error: ';
                }
                
                self.$events = self.$events || { };
                thread = self.$thread = new Thread( thisPath.file );
                thread.onmessage = function( evt ) {
                    if ( evt.data.event )
                    {
                        var event = evt.data.event, data = evt.data.data || null;
                        if ( self.$events && self.$events[ event ] ) 
                        {
                            self.$events[ event ]( data );
                        }
                        else if ( "console.log" === event || "console.error" === event )
                        {
                            console.log( msgLog + (data.output||'') );
                        }
                    }
                };
                thread.onerror = function( evt ) {
                    if ( self.$events && self.$events.error )
                    {
                        self.$events.error( evt );
                    }
                    else
                    {
                        throw new Error( msgErr + evt.message + ' file: ' + evt.filename + ' line: ' + evt.lineno );
                    }
                };
                self.send( 'initThread', { component: component||null, imports: imports ? [].concat(imports) : null } );
            }
            return self;
        }
        
        ,unfork: function( ) {
            var self = this;
            if ( self.$thread )
            {
                self.send( 'dispose' );
                //self.$thread.terminate( );
            }
            self.$thread = null;
            self.$events = null;
            //if ( isThread ) close( );
            return self;
        }
        
        ,listen: function( event, handler ) {
            if ( event && "function"===typeof(handler) && this.$events )
            {
                this.$events[ event ] = handler;
            }
            return this;
        }
        
        ,unlisten: function( event, handler ) {
            if ( event && this.$events && this.$events[ event ] )
            {
                if ( 2 > arguments.length || handler === this.$events[ event ] )
                    delete this.$events[ event ];
            }
            return this;
        }
        
        ,send: function( event, data ) {
            if ( event )
            {
                if ( isThread )
                    postMessage({event: event, data: data || null});
                else if ( this.$thread )
                    this.$thread.postMessage({event: event, data: data || null});
            }
            return this;
        }
        
        ,task: function( task ) {
            if ( task instanceof Task ) return task;
            else if ( 'function' === typeof(task) ) return Task( task );
        }
        
        ,step: function( task ) {
            var self = this;
            if ( task ) self.$queue.push( self.task( task ).queue( self ) );
            return self;
        }
        
        ,steps: function( ) {
            var self = this, tasks = slice( arguments ), i, l;
            l = tasks.length;
            for (i=0; i<l; i++) self.step( tasks[ i ] );
            return self;
        }
        
        // callback template for use as "inverted-control in-place callbacks"
        ,jumpNext: function( offset, returnCallback ) {
            var self = this, queue = self.$queue;
            offset = offset || 0;
            if ( true === returnCallback )
            {
                return function( ) {
                    if ( offset < queue.length )
                    {
                        if ( offset > 0 ) queue.splice( 0, offset );
                        self.run( self.$run_mode );
                    }
                    return self;
                };
            }
            else
            {
                if ( offset < queue.length )
                {
                    if ( offset > 0 ) queue.splice( 0, offset );
                    self.run( self.$run_mode );
                }
                return self;
            }
        }
        
        ,abort: function( returnCallback, delayed ) {
            var self = this;
            if ( true === returnCallback )
            {
                return function( ) {
                    if ( delayed && delayed > 0 )
                    {
                        setTimeout(function( ){
                            self.empty( );
                        }, delayed);
                    }
                    else
                    {
                        self.empty( );
                    }
                    return self;
                };
            }
            else
            {
                if ( delayed && delayed > 0 )
                {
                    setTimeout(function( ){
                        self.empty( );
                    }, delayed);
                }
                else
                {
                    self.empty( );
                }
                return self;
            }
        }
        
        ,run: function( run_mode ) {
            var self = this;
            if ( arguments.length ) self.$run_mode = run_mode;
            else run_mode = self.$run_mode;
            if ( SEQUENCED === run_mode ) runSequenced( self );
            else if ( INTERLEAVED === run_mode ) runInterleaved( self );
            else if ( LINEARISED === run_mode ) runLinearised( self );
            else if ( PARALLELISED === run_mode ) runParallelised( self );
            return self;
        }
    };
    
    if ( isThread )
    {
        var Component = null;
        
        root.console = {
            log: function(s){
                postMessage({event: 'console.log', data: {output: s||''}});
            },
            error: function(s){
                postMessage({event: 'console.error', data: {output: s||''}});
            }
        };
        
        onMessage(function( evt ) {
            var event = evt.data.event, data = evt.data.data || null;
            switch( event )
            {
                case 'initThread':
                    if ( data )
                    {
                        // do any imports if needed
                        if ( data.imports && data.imports.length )
                        {
                            var imports = data.imports.filter( notThisPath );
                            if ( imports.length ) importScripts( imports.join( ',' ) );
                        }
                        // init the given component if needed
                        if ( data.component )
                        {
                            if ( Component )
                            {
                                // optionally call Component.dispsoe method if exists
                                if ( 'function' === typeof(Component.dispose) ) Component.dispose( );
                                Component = null;
                            }
                            var component = data.component.split('.'), o = root;
                            while ( component.length )
                            {
                                if ( component[ 0 ] && component[ 0 ].length && o[ component[ 0 ] ] ) 
                                    o = o[ component[ 0 ] ];
                                component.shift( );
                            }
                            if ( o && root !== o ) Component = new o( );
                        }
                    }
                    break;
                case 'dispose':
                default:
                    if ( Component )
                    {
                        // optionally call Component.dispsoe method if exists
                        if ( 'function' === typeof(Component.dispose) ) Component.dispose( );
                        Component = null;
                    }
                    close( );
                    break;
            }
        });        
    }
    
}( this, EXPORTS );

    /* main code ends here */
    
    /* export the module "Asynchronous" */
    return EXPORTS["Asynchronous"];
});