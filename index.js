
function assert(c,m) {
  if (!c) throw new Error(m);
}

// '5', but not '5.', nor '05', nor '5.0', not '0x5'
function isInt10Exact(str) {
  assert((typeof str) === (typeof ""));
  if (str > 0 || str <= 0)
    return (str|0)+"" === str;
  return false;
}

var has = (function() {
  var H = {}.hasOwnProperty;
  return function(o,n) {
    return H.call(o,n);
  };
})();

function isArrLike(a) {
  if (!a) return false;
  var length = a.length;
  if (length >= 0 || length < 0) {
    var n = "", l = 0;
    for (n in a) {
      if (!has(a,n))
        continue;
      if (!isInt10Exact(n) || n < 0 || n >= length)
        return false;
      l++;
    }
    return l === length;
  }
  return false;
}

function ccode(str) {
  if (str.length <= 0)
    throw new Error('ccode: str.length: '+str.length);
  return str.charCodeAt(0);
}

function roxanBase(obj, thisObj) {
  var o = obj;
  if (o === null)
    return thisObj.rNull();
  if (o === void 0)
    return thisObj.rUndefined();
  switch (typeof o) {
  case typeof 0:
    return thisObj.rNum(o);
  case typeof "":
    return thisObj.rStr(o);
  case typeof false:
    return thisObj.rBool(o);
  default:
    var bkref = thisObj.find(o);

    if (bkref >= 0)
      return thisObj.rBkRef(o, bkref);

    return thisObj.isArrLike(o) ?
      thisObj.rArr(o) :
      thisObj.rObj(o);
  }
}

function isNU(v) {
  return v === null || v === void 0;
}

var CH_TAB = ccode('\t');
var CH_NL = ccode('\n');
var CH_LINEFEED = ccode('\f');
var CH_RET = ccode('\r');
var CH_BKS = ccode('\b');
var CH_VTAB = ccode('\v');
var CH_BSLASH = ccode('\\');

function rNull() { return this.out('null'); } 
function rBool(v) { return this.out(v+""); }
function rNum(v) { return this.out(v+""); }
function rUndefined() { return this.out('undefined'); }
function rBkRef(o,n) { return this.out('&'+n); }

function rArr(arr) {
  var len = arr.length, l = 0;
  this.out('[');
  if (len > 0) {
    this.indent();
    this.enterObj(arr);
    while (l < len) {
      if (l > 0)
        this.out(',');
      this.startLine();
      var elem = arr[l++];
      roxanBase(elem, this);
    }
    var x = this.exitObj();
    assert(x === arr);
    this.unindent();
    this.startLine();
  }
  this.out(']');
}

function rObj(v) {
  var name = "", l = 0;
  this.out('{');
  this.enterObj(v);
  var somethingWritten = false;
  this.indent();
  for (name in v) {
    if (has(v,name)) {
      if (somethingWritten) {
        this.out(',');
        somethingWritten = false;
      }
      this.startLine();
      var elem = v[name];
      if (this.rObjEntry(name, elem)) {
        somethingWritten = true;
        l++;
      }
    }
  }
  var x = this.exitObj(v);
  assert(x === v);

  this.unindent();
  if (l > 0)
    this.startLine();

  this.out('}');
}

function rStr(str) {
  var len = str.length, l = 0, v = "";
  this.out('"');
  while (l < len) {
    var cc = str.charCodeAt(l);
    if (cc >= 32 && cc < 127)
      v += str.charAt(l);
    else switch (cc) {
    case CH_TAB: v += '\\t'; break;
    case CH_NL: v += '\\n'; break;
    case CH_LINEFEED: v += '\\f'; break;
    case CH_RET: v += '\\r'; break;
    case CH_BKS: v += '\\b'; break;
    case CH_VTAB: v += '\\v'; break;
    case CH_BSLASH: v += '\\'; break;
    case 0: v += '\\0'; break;
    default:
      var h;
      if (cc <= 0xff) {
        assert(cc > 0);
        h = hex(cc);
        while (h.length < 2)
          h = '0'+h;
        v += '\\x'+h;
      } else {
        assert(cc <= 0xffff);
        h = hex(cc);
        while (h.length < 4)
          h = '0'+h;
        v += '\\u' + h;
      }
      break;
    }
    l++;
  }
  this.out(v);
  this.out('"');
}

function rObjEntry(n,v) {
  this.rStr(n);
  this.out(':');
  this.out(' ');
  roxanBase(v,this);
  return true;
}

function out(str) {
  if (this.startLineActive) {
    this.startLineActive = false;
    this.rawWrite(this.NEWLINE);
    this.rawWrite(this.curIn);
  }
  this.rawWrite(str);
}

function find(o) {
  var list = this.ancestors, len = list.length, e = 0;
  while (e < len) {
    if (this.objEq(o, list[e]))
      return e;
    e++;
  }
  return -1;
}

function objEq(a,b) { return a === b; }

function indent() {
  var inl = this.curInLevel+1, ic = this.indentCache;
  while (ic.length <= inl)
    ic .push(ic[ic.length-1] + this.SPACE);
  this.curInLevel = inl;
  return this.curIn = ic[inl];
}

function unindent() {
  var inl = this.curInLevel;
  assert(inl > 0);
  return this.curIn = this.indentCache[this.curInLevel = inl - 1]
}

function startLine() {
  assert(!this.startLineActive);
  this.startLineActive = true;
}

function exitObj(v) {
  var a = this.ancestors;
  assert(a.length > 0);
  return a.pop();
}

function enterObj(v) {
  this.ancestors.push(v);
}

function rawWrite(str) {
  this.buf += str;
}

function stringify(v, thisObj) {
  if (thisObj === null || thisObj === void 0)
    thisObj = {};

  var returnBuf = false;

  var need = {};
  thisObj.rNull || (thisObj.rNull = rNull);
  thisObj.rBool || (thisObj.rBool = rBool);
  thisObj.rNum || (thisObj.rNum = rNum);
  thisObj.rUndefined || (thisObj.rUndefined = rUndefined) ;
  thisObj.rBkRef || (thisObj.rBkRef = rBkRef);
  thisObj.rArr || (thisObj.rArr = rArr,
    need.enex = need.inun = need.sl = true);
  thisObj.rObj || (thisObj.rObj = rObj,
    need.enex = need.inun = need.sl = need.objEntry = true);
  thisObj.rStr || (thisObj.rStr = rStr);
  thisObj.find || (thisObj.find = find,
    need.objeq = need.anc = true);
  thisObj.out || (thisObj.out = out,
    need.sla = need.curIn = need.nl = true);
  thisObj.isArrLike || (thisObj.isArrLike = isArrLike);
  thisObj.rawWrite || (thisObj.rawWrite = rawWrite, need.buf = true);
  if (need.objEntry)
    thisObj.rObjEntry || (thisObj.rObjEntry = rObjEntry, need.ws = true);
  if (need.enex) {
    thisObj.enterObj || (thisObj.enterObj = enterObj, need.anc = true);
    thisObj.exitObj || (thisObj.exitObj = exitObj, need.anc = true);
    need.enex = false;
  }
  if (need.inun) {
    thisObj.indent || (thisObj.indent = indent,
      need.ic = need.curIn = need.curInLevel = need.ws = true);
    thisObj.unindent || (thisObj.unindent = unindent,
      need.ic = need.curIn = need.curInLevel = true);
  }
  if (need.curIn) thisObj.curIn || (thisObj.curIn = "");
  if (need.ic) thisObj.indentCache || (thisObj.indentCache = [""]);
  if (need.curInLevel) thisObj.curInLevel || (thisObj.curInLevel = 0);
  if (need.ws) !isNU(thisObj.SPACE) || (thisObj.SPACE = '  ');
  if (need.anc) thisObj.ancestors || (thisObj.ancestors = []);
  if (need.sl) thisObj.startLine || (thisObj.startLine = startLine, need.sla = true);
  if (need.sla) thisObj.startLineActive || (thisObj.startLineActive = false, need.nl = true);
  if (need.buf) thisObj.buf || (thisObj.buf = "", returnBuf = true);
  if (need.nl) !isNU( thisObj.NEWLINE) || (thisObj.NEWLINE = '\n');
  if (need.objeq) thisObj.objEq || (thisObj.objEq = objEq);

  roxanBase(v, thisObj);
  if (returnBuf)
    return thisObj.buf;
}

module.exports.stringify = stringify;
