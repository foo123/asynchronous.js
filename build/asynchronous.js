/**
*
*   Asynchronous.js
*   @version: 0.4.4
*
*   Simple JavaScript class to manage asynchronous, parallel, linear, sequential and interleaved tasks
*   https://github.com/foo123/asynchronous.js
*
**/!function( root, name, factory ) {
    "use strict";
    
    //
    // export the module, umd-style (no other dependencies)
    var isCommonJS = ("object" === typeof(module)) && module.exports, 
        isAMD = ("function" === typeof(define)) && define.amd, m;
    
    // CommonJS, node, etc..
    if ( isCommonJS ) 
        module.exports = (module.$deps = module.$deps || {})[ name ] = module.$deps[ name ] || (factory.call( root, {NODE:module} ) || 1);
    
    // AMD, requireJS, etc..
    else if ( isAMD && ("function" === typeof(require)) && ("function" === typeof(require.specified)) && require.specified(name) ) 
        define( name, ['require', 'exports', 'module'], function( require, exports, module ){ return factory.call( root, {AMD:module} ); } );
    
    // browser, web worker, etc.. + AMD, other loaders
    else if ( !(name in root) ) 
        (root[ name ] = (m=factory.call( root, {} ) || 1)) && isAMD && define( name, [], function( ){ return m; } );


}(  /* current root */          this, 
    /* module name */           "Asynchronous",
    /* module factory */        function( exports ) {
        
    /* main code starts here */

/**
*
*   Asynchronous.js
*   @version: 0.4.4
*
*   Simple JavaScript class to manage asynchronous, parallel, linear, sequential and interleaved tasks
*   https://github.com/foo123/asynchronous.js
*
**/
!function( root, exports, undef ) {
    "use strict";
    
    var PROTO = "prototype", Obj = Object, Arr = Array, Func = Function
        ,FP = Func[PROTO], OP = Obj[PROTO], AP = Arr[PROTO]
        ,slice = FP.call.bind( AP.slice ), toString = FP.call.bind( OP.toString )
        ,typeOf = function( v ) { return typeof(v); }, isFunction = function(f) { return "function" === typeof(f); }
        ,is_instance = function(o, t) { return o instanceof t; }
        ,SetTime = setTimeout, ClearTime = clearTimeout
        ,UNDEFINED = undef, UNKNOWN = 0, NODE = 1, BROWSER = 2
        ,DEFAULT_INTERVAL = 60, NONE = 0, INTERLEAVED = 1, LINEARISED = 2, PARALLELISED = 3, SEQUENCED = 4
        ,isNode = ("undefined" !== typeof( global )) && ('[object global]' === toString( global ))
        // http://nodejs.org/docs/latest/api/all.html#all_cluster
        ,isNodeProcess = !!(isNode && process.env.NODE_UNIQUE_ID)
        ,isBrowser = !isNode && ("undefined" !== typeof( navigator ))
        ,isWebWorker = isBrowser && "function" === typeof( importScripts ) && is_instance(navigator, WorkerNavigator)
        ,isBrowserWindow = isBrowser && !isWebWorker && !!root.opener
        ,isAMD = "function" === typeof( define ) && define.amd
        ,supportsMultiThread = isNode || "function" === typeof( Worker )
        ,isThread = isNodeProcess || isWebWorker
        ,Thread, numProcessors = isNode ? require('os').cpus( ).length : 4
        ,fromJSON = JSON.parse, toJSON = JSON.stringify ,onMessage
        
        ,curry = function( f, a ) { return function( ){return f(a);}; }
        
        ,URL = root.webkitURL || root.URL || null
        ,blobURL = function( src, options ) {
            if ( src && URL ) return URL.createObjectURL( new Blob( src.push ? src : [ src ], options || { type: "text/javascript" }) );
            return src;
        }
        
        // Get current filename/path
        ,path = function( amdMod ) {
            var f;
            if ( isNode ) 
                return { file: __filename, path: __dirname };
            else if ( isWebWorker )
                return { file: (f=self.location.href), path: f.split('/').slice(0, -1).join('/') };
            else if ( isAMD && amdMod && amdMod.uri ) 
                return { file: (f=amdMod.uri), path: f.split('/').slice(0, -1).join('/') };
            else if ( isBrowser && (f = document.getElementsByTagName('script')) && f.length ) 
                return { file: (f=f[f.length - 1].src), path: f.split('/').slice(0, -1).join('/') };
            return { path: null, file: null };
        }
        
        ,thisPath = path( exports.AMD ), tpf = thisPath.file
        
        ,notThisPath = function( p ) {
            return !!(p && p.length && p !== tpf);
        }
        
        ,extend = function( o1, o2 ) {
            o1 = o1 || {};
            if ( o2 )
            {
                for (var k in o2) o1[ k ] = o2[ k ];
            }
            return o1;
        }
        
        ,_uuid = 0
    ;
    
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
            if ( scripts && (scripts=scripts.split(',')).length )
            {
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
        Thread[PROTO] = {
            constructor: Thread,
            process: null,
            
            onmessage: null,
            onerror: null,

            postMessage: function( data ) {
                if ( this.process )
                {
                    this.process.send( toJSON( {data: data} ) );
                }
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
        Thread = root.Worker;
    }
    
    /*if ( isBrowserWindow )
    {
        // load javascript(s) (a)sync using <script> tags if browser (window)
        root.importScripts = function( scripts, callback )  {
            if ( scripts && (scripts=scripts.split(',')).length )
            {
                var dl = scripts.length, i, rel = /^\./, load, next, head, link;
                head = document.getElementsByTagName("head")[ 0 ]; link = document.createElement( 'a' );
                load = function( url, cb ) {
                    var done = 0, script = document.createElement('script');
                    script.type = 'text/javascript'; script.language = 'javascript';
                    script.onload = script.onreadystatechange = function( ) {
                        if (!done && (!script.readyState || script.readyState == 'loaded' || script.readyState == 'complete'))
                        {
                            done = 1; script.onload = script.onreadystatechange = null;
                            cb( );
                            head.removeChild( script ); script = null;
                        }
                    }
                    if ( rel.test( url ) ) 
                    {
                        // http://stackoverflow.com/a/14781678/3591273
                        // let the browser generate abs path
                        link.href = base + url;
                        url = link.protocol + "//" + link.host + link.pathname + link.search + link.hash;
                    }
                    // load it
                    script.src = url; head.appendChild( script );
                };
                next = function next( ) {
                    if ( ++i < dl ) load( scripts[ i ], next );
                    else if ( callback ) callback( );
                };
                load( scripts[ i=0 ], next );
            }
            else if ( callback ) callback( );
        }
    }*/
    
    // Proxy to communication/asyc to another browser window
    function formatOptions( o ) 
    {
        var s = [], k;
        if ( o )
        {
            for (k in o) s.push( k + '=' + o[k] );
        }
        return s.join(",");
    }
    var BrowserWindow = function( options ) {
        var self = this;
        if ( !( self instanceof BrowserWindow) ) return new BrowserWindow( options );
        self.$id = (++_uuid).toString( 16 );
        self.options = extend({
            width: 400,
            height: 400,
            toolbar: "no",
            location: "no",
            directories: "no",
            status: "no",
            menubar: "no",
            scrollbars: "yes",
            resizable: "yes"
        }, options);
    };
    BrowserWindow.prototype = {
        constructor: BrowserWindow
        
        ,options: null
        ,$id: null
        ,$window: null
        
        ,dispose: function( ) {
            var self = this;
            if ( self.$window ) self.close( );
            self.$window = null;
            self.$id = null;
            self.options = null;
            return self;
        }
        
        ,close: function( ) {
            var self = this;
            if ( self.$window )
            {
                if ( !self.$window.closed ) self.$window.close( );
                self.$window = null;
            }
            return self;
        }
        
        ,ready: function( variable, cb ) {
            var self = this, 
                onWindowReady = function onWindowReady( ){
                    if ( !self.$window || (variable && !self.$window[variable]) )
                        setTimeout(onWindowReady, 40);
                    else cb( );
                };
            setTimeout(onWindowReady, 0);
            return self;
        }
        
        ,open: function( urlOrHTML ) {
            var self = this;
            if ( !self.$window && !!urlOrHTML )
            {
                self.$window = window.open( 
                    urlOrHTML.push // dynamic content as blob array (with utf-8 BOM prepended)
                        ? blobURL(["\ufeff"].concat(urlOrHTML), {type: 'text/html;charset=utf-8'})
                        : urlOrHTML, 
                    self.$id, 
                    formatOptions( self.options )
                );
                /*if ( autoDispose )
                {
                    self.$window.onbeforeunload = function( ) {
                       setTimeout(function( ){ self.dispose( ); }, 1500);
                    };
                }*/
            }
            return self;
        }
        
        ,write: function( html ) {
            var self = this;
            if ( self.$window && html)
                self.$window.document.write( html );
            return self;
        }
    };
    
    // Task class/combinator
    var Task = function( aTask ) {
        if ( aTask instanceof Task ) return aTask;
        if ( !(this instanceof Task) ) return new Task( aTask );
        
        var self = this, aqueue = null, task = null,
            onComplete = null, run_once = false,
            times = false, loop = false, recurse = false,
            until = false, untilNot = false, 
            loopObject = null, repeatCounter = 0,
            repeatIncrement = 1, repeatTimes = null,
            repeatUntil = null, repeatUntilNot = null,
            lastResult = undef, run
        ;
        
        self.queue = function( q ) {
            if ( arguments.length )
            {
                aqueue = q;
                return self;
            }
            return aqueue;
        };
        
        self.jumpNext = function( offset ) { 
            if ( aqueue ) aqueue.jumpNext( false, offset ); 
        };
        
        self.abort = function( dispose ) {
            if ( aqueue ) 
            {
                aqueue.abort( false );
                if ( dispose ) 
                {
                    aqueue.dispose( );
                    aqueue = null;
                }
            }
        };
        
        self.dispose = function( ) { 
            if ( aqueue ) 
            {
                aqueue.dispose( ); 
                aqueue = null;
            }
        };
        
        self.task = function( t ) {
            task = t;
            /*task.jumpNext = self.jumpNext;
            task.abort = self.abort;
            task.dispose = self.dispose;*/
            return self;
        };
        
        if ( aTask ) self.task( aTask );
        
        self.run = run = function( ) {
            // add queue/task methods on task func itself
            // instead of passing "this" as task param
            // use task as "nfe" or "arguments.callee" or whatelse,
            task.jumpNext = self.jumpNext;
            task.abort = self.abort;
            task.dispose = self.dispose;
            lastResult = task( /*self*/ );
            run_once = true;
            task.jumpNext = null;
            task.abort = null;
            task.dispose = null;
            return lastResult;
        };
        
        self.runWithArgs = function( args ) {
            task.jumpNext = self.jumpNext;
            task.abort = self.abort;
            task.dispose = self.dispose;
            lastResult = task.apply( null, args );
            run_once = true;
            task.jumpNext = null;
            task.abort = null;
            task.dispose = null;
            return lastResult;
        };
        
        self.canRun = function( ) {
            if ( !task ) return false;
            if ( run_once && !times && !loop && !recurse && !until && !untilNot ) return false;
            if ( (times || loop) && repeatCounter >= repeatTimes ) return false;
            if ( loop && !loopObject ) return false;
            if ( (recurse || until) && lastResult === repeatUntil ) return false;
            return true;
        };
        
        self.iif = function( cond, if_true_task, else_task ) {
            if ( cond ) self.task( if_true_task );
            else if ( arguments.length > 2 ) self.task( else_task );
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
        
        self.loop = function( numTimes, startCounter, increment ) {
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
        
        self.each = function( loopObj ) {
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
            if ( onComplete && isFunction(onComplete) ) onComplete( );
            return self;
        };
    };
    /*Task.iif = function( ) { var args = arguments, T = new Task( ); return T.iif.apply( T, args ); };
    Task.until = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.until.apply( T, args ); };
    Task.untilNot = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.untilNot.apply( T, args ); };
    Task.loop = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.loop.apply( T, args ); };
    Task.each = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.each.apply( T, args ); };
    Task.recurse = function( ) { var args = slice(arguments), T = new Task( args.pop() ); return T.recurse.apply( T, args ); };*/
    
    /*var Field = function( f ) {
        return new Func("o", "return o"+(f||'')+";");
    };*/
    
    // run tasks in parallel threads (eg. web workers, child processes)
    function runParallelised( scope, args ) 
    { 
        scope.$runmode = PARALLELISED;
        scope.$running = false;
    }
    
    // serialize async-tasks that are non-blocking/asynchronous in a quasi-sequential manner
    function runLinearised( scope, args ) 
    { 
        var self = scope, queue = self.$queue, task;
        self.$runmode = LINEARISED;
        if ( queue )
        {
            while ( queue.length && (!queue[ 0 ] || !queue[ 0 ].canRun( )) ) queue.shift( );
            // first task should call next tasks upon completion, via "in-place callback templates"
            if ( queue.length ) 
            {
                self.$running = true;
                task = queue.shift( );
                if ( args ) task.runWithArgs( args ); else task.run( );
                task.complete( );
            }
            else
            {
                self.$running = false;
            }
        }
    }
    
    // interleave async-tasks in background in quasi-parallel manner
    function runInterleaved( scope, args ) 
    { 
        var self = scope, queue = self.$queue, task, index = 0;
        self.$runmode = INTERLEAVED;
        if ( queue && queue.length )
        {
            self.$running = true;
            while ( index < queue.length )
            {
                task = queue[ index ];
                
                if ( task && task.canRun( ) )
                {
                    if ( args ) task.runWithArgs( args ); else task.run( );
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
            self.$running = false;
            self.$timer = SetTime( curry( runInterleaved, self ), self.$interval );
        }
    }
    
    // run tasks in a quasi-asynchronous manner (avoid blocking the thread)
    function runSequenced( scope, args ) 
    {
        var self = scope, queue = self.$queue, task;
        self.$runmode = SEQUENCED;
        if ( queue && queue.length )
        {
            task = queue[ 0 ];
            
            if ( task && task.canRun( ) )
            {
                self.$running = true;
                if ( args ) task.runWithArgs( args ); else task.run( );
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
            self.$running = false;
            self.$timer = SetTime( curry( runSequenced, self ), self.$interval );
        }
    }
    
    // manage tasks which may run in steps and tasks which are asynchronous
    var Asynchronous = exports['Asynchronous'] = function( interval, initThread ) {
        // can be used as factory-constructor for both Async and Task classes
        if ( is_instance(interval, Task) ) return interval;
        if ( isFunction(interval) ) return new Task( interval );
        if ( !is_instance(this, Asynchronous) ) return new Asynchronous( interval );
        var self = this;
        self.$interval = arguments.length ? parseInt(interval, 10) : DEFAULT_INTERVAL;
        self.$timer = null;
        self.$runmode = NONE;
        self.$running = false;
        self.$queue = [ ];
        if ( isThread && (false !== initThread) ) self.initThread( );
    };
    Asynchronous.VERSION = "0.4.4";
    Asynchronous.Thread = Thread;
    Asynchronous.Task = Task;
    Asynchronous.BrowserWindow = BrowserWindow;
    //Asynchronous.Field = Field;
    Asynchronous.MODE = { NONE: NONE, INTERLEAVE: INTERLEAVED, LINEAR: LINEARISED, PARALLEL: PARALLELISED, SEQUENCE: SEQUENCED };
    Asynchronous.Platform = { UNDEFINED: UNDEFINED, UNKNOWN: UNKNOWN, NODE: NODE, BROWSER: BROWSER };
    Asynchronous.supportsMultiThreading = function( ){ return supportsMultiThread; };
    Asynchronous.isPlatform = function( platform ) { 
        if ( NODE === platform ) return isNode;
        else if ( BROWSER === platform ) return isBrowser;
        return undef; 
    };
    Asynchronous.isThread = function( platform ) { 
        if ( NODE === platform ) return isNodeProcess;
        else if ( BROWSER === platform ) return isWebWorker;
        return isThread; 
    };
    Asynchronous.path = path;
    Asynchronous.blob = blobURL;
    /*
    /**
     * Provides requestAnimationFrame in a cross browser way.
     * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
     * /
    Asynchronous.requestAnimationFrame = (function( window ) {
        return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function( /* function FrameRequestCallback * / callback, /* DOMElement Element * / element ) {
            /*window.* /SetTime( callback, 1000 / 60 );
        };
    })( root );
    */
    Asynchronous.load = function( component, imports, asInstance ) {
        if ( component )
        {
            var initComponent = function( ) {
                // init the given component if needed
                component = component.split('.'); 
                var o = root;
                while ( component.length )
                {
                    if ( component[ 0 ] && component[ 0 ].length && o[ component[ 0 ] ] ) 
                        o = o[ component[ 0 ] ];
                    component.shift( );
                }
                if ( o && root !== o )
                {
                    if ( isFunction(o) ) return (false !== asInstance) ? new o( ) : o( );
                    return o;
                }
            };
            
            // do any imports if needed
            if ( imports && imports.length )
            {
                imports = imports.filter( notThisPath );
                if ( imports.length ) 
                {
                    /*if ( isBrowserWindow ) 
                    {
                        importScripts( imports.join( ',' ), initComponent );
                    }
                    else
                    {*/
                        importScripts( imports.join( ',' ) );
                    /*}*/
                }
            }
           return initComponent( );
        }
        return null;
    };
    // async queue as serializer
    Asynchronous.serialize = function( queue ) {
        queue = queue || new Asynchronous( );
        var serialize = function( func ) {
            var serialized = function( ) {
                var scope = this, args = arguments;
                queue.step( function( ){ func.apply( scope, args ); } );
                if ( !queue.$running ) queue.run( LINEARISED );
            };
            // free the serialized func
            serialized.free = function( ) { return func; };
            return serialized;
        };
        // free the queue
        serialize.free = function( ) { if ( queue ) queue.dispose( ); queue = null; };
        return serialize;
    };
    Asynchronous[PROTO] = {

        constructor: Asynchronous
        
        ,$interval: DEFAULT_INTERVAL
        ,$timer: null
        ,$queue: null
        ,$thread: null
        ,$events: null
        ,$runmode: NONE
        ,$running: false
        
        ,dispose: function( ) {
            var self = this;
            self.unfork( true );
            if ( self.$timer ) ClearTime( self.$timer );
            self.$thread = null;
            self.$timer = null;
            self.$interval = null;
            self.$queue = null;
            self.$runmode = NONE;
            self.$running = false;
            return self;
        }
        
        ,empty: function( ) {
            var self = this;
            if ( self.$timer ) ClearTime( self.$timer );
            self.$timer = null;
            self.$queue = [ ];
            self.$runmode = NONE;
            self.$running = false;
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
        
        // fork a new process/thread (e.g WebWorker, NodeProcess etc..)
        ,fork: function( component, imports, asInstance ) {
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
                thread = self.$thread = new Thread( tpf );
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
                self.send( 'initThread', { component: component||null, asInstance: false !== asInstance, imports: imports ? [].concat(imports) : null } );
            }
            return self;
        }
        
        ,unfork: function( explicit ) {
            var self = this;
            if ( self.$thread )
            {
                self.send( 'dispose' );
                if ( true === explicit ) self.$thread.terminate( );
            }
            self.$thread = null;
            self.$events = null;
            //if ( isThread ) close( );
            return self;
        }
        
        ,initThread: function( ) {
            var self = this;
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
            return self;
        }
        
        ,listen: function( event, handler ) {
            if ( event && isFunction(handler) && this.$events )
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
            if ( is_instance(task, Task) ) return task;
            else if ( isFunction(task) ) return Task( task );
        }
        
        ,iif: function( ) { 
            var args = arguments, T = new Task( ); 
            return T.iif.apply( T, args ); 
        }
        
        ,until: function( ) { 
            var args = slice(arguments), T = new Task( args.pop( ) ); 
            return T.until.apply( T, args ); 
        }
        
        ,untilNot: function( ) { 
            var args = slice(arguments), T = new Task( args.pop( ) ); 
            return T.untilNot.apply( T, args ); 
        }
        
        ,loop: function( ) { 
            var args = slice(arguments), T = new Task( args.pop( ) ); 
            return T.loop.apply( T, args ); 
        }
        
        ,each: function( ) { 
            var args = slice(arguments), T = new Task( args.pop( ) ); 
            return T.each.apply( T, args ); 
        }
        
        ,recurse: function( ) { 
            var args = slice(arguments), T = new Task( args.pop( ) ); 
            return T.recurse.apply( T, args ); 
        }
        
        ,step: function( task ) {
            var self = this;
            if ( task ) self.$queue.push( self.task( task ).queue( self ) );
            return self;
        }
        
        ,steps: function( ) {
            var self = this, tasks = arguments, i, l;
            l = tasks.length;
            for (i=0; i<l; i++) self.step( tasks[ i ] );
            return self;
        }
        
        // callback template for use as "inverted-control in-place callbacks"
        ,jumpNext: function( returnCallback, offset ) {
            var self = this, queue = self.$queue;
            offset = offset || 0;
            if ( false !== returnCallback )
            {
                return function( ) {
                    if ( offset < queue.length )
                    {
                        if ( offset > 0 ) queue.splice( 0, offset );
                        self.run( self.$runmode );
                    }
                    return self;
                };
            }
            else
            {
                if ( offset < queue.length )
                {
                    if ( offset > 0 ) queue.splice( 0, offset );
                    self.run( self.$runmode );
                }
                return self;
            }
        }
        
        // callback template for use as "inverted-control in-place callbacks"
        ,jumpNextWithArgs: function( returnCallback, offset, args ) {
            var self = this, queue = self.$queue;
            offset = offset || 0;
            if ( false !== returnCallback )
            {
                return function( ) {
                    if ( offset < queue.length )
                    {
                        if ( offset > 0 ) queue.splice( 0, offset );
                        self.run( self.$runmode, arguments );
                    }
                    return self;
                };
            }
            else
            {
                if ( offset < queue.length )
                {
                    if ( offset > 0 ) queue.splice( 0, offset );
                    self.run( self.$runmode, args );
                }
                return self;
            }
        }
        
        ,abort: function( returnCallback, delayed ) {
            var self = this;
            if ( false !== returnCallback )
            {
                return function( ) {
                    if ( delayed && delayed > 0 )
                    {
                        SetTime(function( ){
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
                    SetTime(function( ){
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
        
        ,run: function( run_mode, args ) {
            var self = this;
            if ( arguments.length ) self.$runmode = run_mode;
            else run_mode = self.$runmode;
            args = args || null;
            if ( SEQUENCED === run_mode ) runSequenced( self, args );
            else if ( INTERLEAVED === run_mode ) runInterleaved( self, args );
            else if ( LINEARISED === run_mode ) runLinearised( self, args );
            else if ( PARALLELISED === run_mode ) runParallelised( self, args );
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
                    if ( data && data.component )
                    {
                        if ( Component )
                        {
                            // optionally call Component.dispsoe method if exists
                            if ( isFunction(Component.dispose) ) Component.dispose( );
                            Component = null;
                        }
                        Component = Asynchronous.load( data.component, data.imports, data.asInstance );
                    }
                    break;
                case 'dispose':
                default:
                    if ( Component )
                    {
                        // optionally call Component.dispsoe method if exists
                        if ( isFunction(Component.dispose) ) Component.dispose( );
                        Component = null;
                    }
                    close( );
                    break;
            }
        });        
    }
    
}( this, exports );    
    /* main code ends here */
    /* export the module */
    return exports["Asynchronous"];
});