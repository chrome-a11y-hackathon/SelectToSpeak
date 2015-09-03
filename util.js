// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview ChromeVox utilities for the automation extension API.
 */

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview ChromeVox predicates for the automation extension API.
 */
var RoleType = chrome.automation.RoleType;

/**
 * @constructor
 */
AutomationPredicate = function() {};

/**
 * @typedef {function(chrome.automation.AutomationNode) : boolean}
 */
AutomationPredicate.Unary;

/**
 * @typedef {function(chrome.automation.AutomationNode,
 *                    chrome.automation.AutomationNode) : boolean}
 */
AutomationPredicate.Binary;

/**
 * Constructs a predicate given a role.
 * @param {RoleType} role
 * @return {AutomationPredicate.Unary}
 */
AutomationPredicate.withRole = function(role) {
  return function(node) {
    return node.role == role;
  };
};

/** @type {AutomationPredicate.Unary} */
AutomationPredicate.checkBox = AutomationPredicate.withRole(RoleType.checkBox);
/** @type {AutomationPredicate.Unary} */
AutomationPredicate.comboBox = AutomationPredicate.withRole(RoleType.comboBox);
/** @type {AutomationPredicate.Unary} */
AutomationPredicate.editText = AutomationPredicate.withRole(RoleType.textField);
/** @type {AutomationPredicate.Unary} */
AutomationPredicate.heading = AutomationPredicate.withRole(RoleType.heading);
/** @type {AutomationPredicate.Unary} */
AutomationPredicate.inlineTextBox =
    AutomationPredicate.withRole(RoleType.inlineTextBox);
/** @type {AutomationPredicate.Unary} */
AutomationPredicate.link = AutomationPredicate.withRole(RoleType.link);
/** @type {AutomationPredicate.Unary} */
AutomationPredicate.table = AutomationPredicate.withRole(RoleType.table);

/**
 * @param {chrome.automation.AutomationNode} node
 * @return {boolean}
 */
AutomationPredicate.button = function(node) {
  return /button/i.test(node.role);
};

/**
 * @param {chrome.automation.AutomationNode} node
 * @return {boolean}
 */
AutomationPredicate.formField = function(node) {
  switch (node.role) {
    case 'button':
    case 'buttonDropDown':
    case 'checkBox':
    case 'comboBox':
    case 'date':
    case 'dateTime':
    case 'details':
    case 'disclosureTriangle':
    case 'form':
    case 'menuButton':
    case 'menuListPopup':
    case 'popUpButton':
    case 'radioButton':
    case 'searchBox':
    case 'slider':
    case 'spinButton':
    case 'switch':
    case 'tab':
    case 'textField':
    case 'time':
    case 'toggleButton':
    case 'tree':
      return true;
  }
  return false;
};

/**
 * @param {chrome.automation.AutomationNode} node
 * @return {boolean}
 */
AutomationPredicate.landmark = function(node) {
  switch (node.role) {
    case 'application':
    case 'banner':
    case 'complementary':
    case 'contentInfo':
    case 'form':
    case 'main':
    case 'navigation':
    case 'search':
      return true;
  }
  return false;
};

/**
 * @param {chrome.automation.AutomationNode} node
 * @return {boolean}
 */
AutomationPredicate.visitedLink = function(node) {
  return node.state.visited;
};

/**
 * @param {chrome.automation.AutomationNode} node
 * @return {boolean}
 */
AutomationPredicate.focused = function(node) {
  return node.state.focused;
};

/**
 * @param {chrome.automation.AutomationNode} node
 * @return {boolean}
 */
AutomationPredicate.leaf = function(node) {
  return !node.firstChild ||
      node.role == RoleType.button ||
      node.role == RoleType.buttonDropDown ||
      node.role == RoleType.popUpButton ||
      node.role == RoleType.slider ||
      node.role == RoleType.textField ||
      node.children.every(function(n) {
        return n.state.invisible;
      });
};

/**
 * @param {chrome.automation.AutomationNode} node
 * @return {boolean}
 */
AutomationPredicate.leafWithText = function(node) {
  return AutomationPredicate.leaf(node) &&
      !!(node.name || node.value);
};

/**
 * @param {chrome.automation.AutomationNode} first
 * @param {chrome.automation.AutomationNode} second
 * @return {boolean}
 */
AutomationPredicate.linebreak = function(first, second) {
  // TODO(dtseng): Use next/previousOnLin once available.
  var fl = first.location;
  var sl = second.location;
  return fl.top != sl.top ||
      (fl.top + fl.height != sl.top + sl.height);
};

/**
 * Leaf nodes that should be ignored while traversing the automation tree. For
 * example, apply this predicate when moving to the next element.
 * @param {chrome.automation.AutomationNode} node
 * @return {boolean}
 */
AutomationPredicate.shouldIgnoreLeaf = function(node) {
  return AutomationPredicate.leaf(node) &&
      (node.role == RoleType.client ||
      node.role == RoleType.div ||
      (node.role == 'image' && node.name == '') ||
      (node.role == 'staticText' && node.value == ''));
};



/**
 * @constructor
 */
AutomationUtil = function() {};

/**
 * Possible directions to perform tree traversals.
 * @enum {string}
 */
AutomationUtil.Dir = {
  // Search from left to right.
  FORWARD: 'forward',

  // Search from right to left.
  BACKWARD: 'backward'
};



var AutomationNode = chrome.automation.AutomationNode;
var Dir = AutomationUtil.Dir;

/**
 * Find a node in subtree of |cur| satisfying |pred| using pre-order traversal.
 * @param {AutomationNode} cur Node to begin the search from.
 * @param {Dir} dir
 * @param {AutomationPredicate.Unary} pred A predicate to apply
 *     to a candidate node.
 * @return {AutomationNode}
 */
AutomationUtil.findNodePre = function(cur, dir, pred) {
  if (pred(cur))
    return cur;

  var child = dir == Dir.BACKWARD ? cur.lastChild : cur.firstChild;
  while (child) {
    var ret = AutomationUtil.findNodePre(child, dir, pred);
    if (ret)
      return ret;
    child = dir == Dir.BACKWARD ?
        child.previousSibling : child.nextSibling;
  }
};

/**
 * Find a node in subtree of |cur| satisfying |pred| using post-order traversal.
 * @param {AutomationNode} cur Node to begin the search from.
 * @param {Dir} dir
 * @param {AutomationPredicate.Unary} pred A predicate to apply
 *     to a candidate node.
 * @return {AutomationNode}
 */
AutomationUtil.findNodePost = function(cur, dir, pred) {
  var child = dir == Dir.BACKWARD ? cur.lastChild : cur.firstChild;
  while (child) {
    var ret = AutomationUtil.findNodePost(child, dir, pred);
    if (ret)
      return ret;
    child = dir == Dir.BACKWARD ?
        child.previousSibling : child.nextSibling;
  }

  if (pred(cur))
    return cur;
};

/**
 * Find the next node in the given direction that is either an immediate sibling
 * or a sibling of an ancestor.
 * @param {AutomationNode} cur Node to start search from.
 * @param {Dir} dir
 * @return {AutomationNode}
 */
AutomationUtil.findNextSubtree = function(cur, dir) {
  while (cur) {
    var next = dir == Dir.BACKWARD ?
        cur.previousSibling : cur.nextSibling;
    if (!AutomationUtil.isInSameTree(cur, next))
      return null;
    if (next)
      return next;
    if (!AutomationUtil.isInSameTree(cur, cur.parent))
      return null;
    cur = cur.parent;
    if (AutomationUtil.isTraversalRoot_(cur))
      return null;
  }
};

/**
 * Find the next node in the given direction in depth first order.
 * @param {AutomationNode} cur Node to begin the search from.
 * @param {Dir} dir
 * @param {AutomationPredicate.Unary} pred A predicate to apply
 *     to a candidate node.
 * @return {AutomationNode}
 */
AutomationUtil.findNextNode = function(cur, dir, pred) {
  var next = cur;
  do {
    if (!(next = AutomationUtil.findNextSubtree(cur, dir)))
      return null;
    cur = next;
    next = AutomationUtil.findNodePre(next, dir, pred);
    if (next && AutomationPredicate.shouldIgnoreLeaf(next)) {
      cur = next;
      next = null;
    }
  } while (!next);
  return next;
};

/**
 * Given nodes a_1, ..., a_n starting at |cur| in pre order traversal, apply
 * |pred| to a_i and a_(i - 1) until |pred| is satisfied.  Returns a_(i - 1) or
 * a_i (depending on opt_options.before) or null if no match was found.
 * @param {AutomationNode} cur
 * @param {Dir} dir
 * @param {AutomationPredicate.Binary} pred
 * @param {{filter: (AutomationPredicate.Unary|undefined),
 *      before: boolean?}=} opt_options
 *     filter - Filters which candidate nodes to consider. Defaults to leaf
 *         only.
 *     before - True to return a_(i - 1); a_i otherwise. Defaults to false.
 * @return {AutomationNode}
 */
AutomationUtil.findNodeUntil = function(cur, dir, pred, opt_options) {
  opt_options =
      opt_options || {filter: AutomationPredicate.leaf, before: false};
  if (!opt_options.filter)
    opt_options.filter = AutomationPredicate.leaf;

  var before = null;
  var after = null;
  var prev = cur;
  AutomationUtil.findNextNode(cur,
      dir,
      function(candidate) {
        if (!opt_options.filter(candidate))
          return false;

        var satisfied = pred(prev, candidate);

        prev = candidate;
        if (!satisfied)
          before = candidate;
        else
          after = candidate;
        return satisfied;
    });
  return opt_options.before ? before : after;
};

/**
 * Returns an array containing ancestors of node starting at root down to node.
 * @param {!AutomationNode} node
 * @return {!Array<AutomationNode>}
 */
AutomationUtil.getAncestors = function(node) {
  var ret = [];
  var candidate = node;
  while (candidate) {
    ret.push(candidate);

    if (!AutomationUtil.isInSameTree(candidate, candidate.parent))
      break;

    candidate = candidate.parent;
  }
  return ret.reverse();
};

/**
 * Gets the first index where the two input arrays differ. Returns -1 if they
 * do not.
 * @param {!Array<AutomationNode>} ancestorsA
 * @param {!Array<AutomationNode>} ancestorsB
 * @return {number}
 */
AutomationUtil.getDivergence = function(ancestorsA, ancestorsB) {
  for (var i = 0; i < ancestorsA.length; i++) {
    if (ancestorsA[i] !== ancestorsB[i])
      return i;
  }
  if (ancestorsA.length == ancestorsB.length)
    return -1;
  return ancestorsA.length;
};

/**
 * Returns ancestors of |node| that are not also ancestors of |prevNode|.
 * @param {!AutomationNode} prevNode
 * @param {!AutomationNode} node
 * @return {!Array<AutomationNode>}
 */
AutomationUtil.getUniqueAncestors = function(prevNode, node) {
  var prevAncestors = AutomationUtil.getAncestors(prevNode);
  var ancestors = AutomationUtil.getAncestors(node);
  var divergence = AutomationUtil.getDivergence(prevAncestors, ancestors);
  return ancestors.slice(divergence);
};

/**
 * Given |nodeA| and |nodeB| in that order, determines their ordering in the
 * document.
 * @param {!AutomationNode} nodeA
 * @param {!AutomationNode} nodeB
 * @return {AutomationUtil.Dir}
 */
AutomationUtil.getDirection = function(nodeA, nodeB) {
  var ancestorsA = AutomationUtil.getAncestors(nodeA);
  var ancestorsB = AutomationUtil.getAncestors(nodeB);
  var divergence = AutomationUtil.getDivergence(ancestorsA, ancestorsB);

  // Default to Dir.FORWARD.
  if (divergence == -1)
    return Dir.FORWARD;

  var divA = ancestorsA[divergence];
  var divB = ancestorsB[divergence];

  // One of the nodes is an ancestor of the other. Don't distinguish and just
  // consider it Dir.FORWARD.
  if (!divA || !divB || divA.parent === nodeB || divB.parent === nodeA)
    return Dir.FORWARD;

  return divA.indexInParent <= divB.indexInParent ? Dir.FORWARD : Dir.BACKWARD;
};

/**
 * Determines whether the two given nodes come from the same tree source.
 * @param {AutomationNode} a
 * @param {AutomationNode} b
 * @return {boolean}
 */
AutomationUtil.isInSameTree = function(a, b) {
  if (!a || !b)
    return true;

  // Given two non-desktop roots, consider them in the "same" tree.
  return a.root === b.root ||
      (a.root.role == b.root.role && a.root.role == 'rootWebArea');
};

/**
 * Returns whether the given node should not be crossed when performing
 * traversals up the ancestry chain.
 * @param {AutomationNode} node
 * @return {boolean}
 * @private
 */
AutomationUtil.isTraversalRoot_ = function(node) {
  switch (node.role) {
    case 'dialog':
    case 'window':
      return true;
    case 'toolbar':
      return node.root.role == 'desktop';
    default:
      return false;
  }
};
