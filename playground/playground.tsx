/* eslint-disable max-len, react/no-unescaped-entities */

import React from 'react';
import debounce from 'lodash/debounce';

import { Differ, Viewer, ViewerProps } from '../src';
import type { DifferOptions, InlineDiffOptions } from '../src';

import GeneratedCode from './generated-code';
import jsStringify from './js-stringify';
import Label from './label';
import { updateInitialValues, useInitialValues } from './initial-values';

import '../src/viewer-monokai.less';
import './playground.less';

interface PlaygroundProps {
  onSwitch: () => void;
}

const Playground: React.FC<PlaygroundProps> = props => {
  // differ props
  const [detectCircular] = React.useState(true);
  const [maxDepth, setMaxDepth] = React.useState(Infinity);
  const [showModifications, setShowModifications] = React.useState(true);
  const [arrayDiffMethod, setArrayDiffMethod] = React.useState<DifferOptions['arrayDiffMethod']>('lcs');
  const [ignoreCase, setIgnoreCase] = React.useState(false);
  const [ignoreCaseForKey, setIgnoreCaseForKey] = React.useState(false);
  const [recursiveEqual, setRecursiveEqual] = React.useState(true);
  const [preserveKeyOrder, setPreserveKeyOrder] = React.useState<DifferOptions['preserveKeyOrder']>(undefined);
  const [compareKey, setCompareKey] = React.useState<string>('');

  // viewer props
  const [indent, setIndent] = React.useState(4);
  const [highlightInlineDiff, setHighlightInlineDiff] = React.useState(true);
  const [inlineDiffMode, setInlineDiffMode] = React.useState<InlineDiffOptions['mode']>('word');
  const [inlineDiffSeparator, setInlineDiffSeparator] = React.useState(' ');
  const [hideUnchangedLines, setHideUnchangedLines] = React.useState(true);
  const [syntaxHighlight, setSyntaxHighlight] = React.useState(false);
  const [virtual, setVirtual] = React.useState(false);

  const differOptions = React.useMemo(() => ({
    detectCircular,
    maxDepth,
    showModifications,
    arrayDiffMethod,
    ignoreCase,
    ignoreCaseForKey,
    recursiveEqual,
    preserveKeyOrder,
    compareKey: compareKey || undefined,
  }), [
    detectCircular,
    maxDepth,
    showModifications,
    arrayDiffMethod,
    ignoreCase,
    ignoreCaseForKey,
    recursiveEqual,
    preserveKeyOrder,
    compareKey,
  ]);
  const differ = React.useMemo(() => new Differ(differOptions), [differOptions]);
  const [diff, setDiff] = React.useState(differ.diff('', ''));
  const [fullscreen, setFullscreen] = React.useState(false);
  const [error, setError] = React.useState('');

  const _triggerDiff = (before: string, after: string) => {
    try {
      const result = differ.diff(
        JSON.parse(String(before || 'null')),
        JSON.parse(String(after || 'null')),
      );
      setError('');
      setDiff(result);
    } catch (e) {
      setError(e.message);
      console.error(e); // eslint-disable-line no-console
    }
  };
  const triggerDiff = React.useCallback(debounce(_triggerDiff, 500), [differ]);

  const inlineDiffOptions = React.useMemo(() => ({
    mode: inlineDiffMode,
    wordSeparator: inlineDiffSeparator,
  }), [inlineDiffMode, inlineDiffSeparator]);
  const virtualOptions = React.useMemo(() => {
    return virtual && {
      scrollContainer: '.playground .layout-right .results',
      itemHeight: 16,
      expandLineHeight: 27,
    };
  }, [virtual]);
  const viewerOptions: Omit<ViewerProps, 'diff'> = React.useMemo(() => ({
    indent,
    lineNumbers: true,
    highlightInlineDiff,
    inlineDiffOptions,
    hideUnchangedLines,
    syntaxHighlight: syntaxHighlight ? { theme: 'monokai' } : false,
    virtual: virtualOptions,
  }), [
    indent,
    highlightInlineDiff,
    inlineDiffOptions,
    hideUnchangedLines,
    syntaxHighlight,
    virtualOptions,
  ]);

  const code = `
const d = new Differ(${jsStringify(differOptions)});
const diff = d.diff(before, after);

const viewerProps = ${jsStringify(viewerOptions)};
return (
  <Viewer
    diff={diff}
    {...viewerProps}
  />
);
`.trim();

  // inputs
  const { l, r } = useInitialValues();
  const beforeRef = React.useRef(l || '');
  const afterRef = React.useRef(r || '');
  const beforeInputRef = React.useRef<HTMLTextAreaElement>(null);
  const afterInputRef = React.useRef<HTMLTextAreaElement>(null);
  const setBefore = (value: string, diff: boolean) => {
    beforeRef.current = value;
    updateInitialValues(beforeRef.current, afterRef.current);
    if (diff) {
      triggerDiff(beforeRef.current, afterRef.current);
    }
  };
  const setAfter = (value: string, diff: boolean) => {
    afterRef.current = value;
    updateInitialValues(beforeRef.current, afterRef.current);
    if (diff) {
      triggerDiff(beforeRef.current, afterRef.current);
    }
  };
  const clearAll = () => {
    beforeRef.current = '';
    afterRef.current = '';
    updateInitialValues('', '');
  };
  const beautify = () => {
    let before = '';
    let after = '';
    try {
      if (beforeRef) {
        before = JSON.stringify(JSON.parse(beforeRef.current || 'null'), null, 2);
      }
      if (afterRef) {
        after = JSON.stringify(JSON.parse(afterRef.current || 'null'), null, 2);
      }
    } catch (e) {
      setError(e.message);
      console.error(e); // eslint-disable-line no-console
    }
    if (before || after) {
      beforeInputRef.current!.value = before;
      afterInputRef.current!.value = after;
      setBefore(before, false);
      setAfter(after, false);
      updateInitialValues(before, after);
    }
  };
  React.useEffect(() => {
    if (l !== beforeRef.current || r !== afterRef.current) {
      setBefore(l || '', false);
      setAfter(r || '', false);
      triggerDiff(l, r);
    }
  }, [l, r]);
  React.useEffect(() => {
    _triggerDiff(beforeRef.current, afterRef.current);
  }, [differOptions]);

  return (
    <div className="playground">
      <div className="layout-left">
        <div className="logo">JSON Diff Kit</div>
        <div className="back" onClick={props.onSwitch}>Go to docs & demo</div>
        <div className="config">
          <form>
            <legend>DIFFER CONFIGURATION</legend>
            <label htmlFor="detect-circular">
              <Label
                title="Detect circular references"
                tip={
                  <>
                    Whether to detect circular reference in source objects before diff starts. Default is <code>true</code>. If you are confident about your data (maybe it's from <code>JSON.parse</code> or an API response), you can set it to <code>false</code> to improve performance, but the algorithm may not stop if circular reference does show up.
                  </>
                }
              />
              <input
                type="checkbox"
                id="detect-circular"
                checked={detectCircular}
                disabled
              />
            </label>
            <label htmlFor="max-depth">
              <Label
                title="Max depth"
                tip={
                  <>
                    If there are nested objects in your data, you can set a max depth to limit the diff to a certain level. Default is <code>Infinity</code>. If you set it to <code>0</code>, only the top level will be diffed.
                  </>
                }
              />
              <label htmlFor="max-depth-infinity" style={{ margin: '0 4px 0 0' }}>
                ∞&nbsp;
                <input
                  type="checkbox"
                  id="max-depth-infinity"
                  checked={maxDepth === Infinity}
                  onChange={e => setMaxDepth(e.target.checked ? Infinity : 0)}
                />
              </label>
              <input
                type="number"
                id="max-depth"
                value={maxDepth === Infinity ? undefined : maxDepth}
                onChange={e => setMaxDepth(Number(e.target.value))}
                min={0}
                max={10}
                step={1}
                disabled={maxDepth === Infinity}
                style={{ width: '3em' }}
              />
            </label>
            <label htmlFor="show-modifications">
              <Label
                title="Show modifications"
                tip={
                  <>
                    Support recognizing modifications, default <code>true</code> means the differ will output the <code>* modified</code> sign apart from the basic <code>+ add</code> and <code>- remove</code> sign. If you prefer Git-style output, please set it to <code>false</code>.
                  </>
                }
              />
              <input
                type="checkbox"
                id="show-modifications"
                checked={showModifications}
                onChange={e => setShowModifications(e.target.checked)}
              />
            </label>
            <label htmlFor="array-diff-method">
              <Label
                title="Array diff method"
                tip={
                  <>
                    The way to diff arrays, default is <code>"normal"</code>, using <code>"lcs"</code> may get a better result but much slower. <code>"unorder-normal"</code> and <code>"unorder-lcs"</code> are for unordered arrays (the order of elements in the array doesn't matter). <code>"compare-key"</code> matches objects by a specific key property.
                  </>
                }
              />
              <select
                id="array-diff-method"
                value={arrayDiffMethod}
                onChange={e => setArrayDiffMethod(e.target.value as DifferOptions['arrayDiffMethod'])}
              >
                <option value="normal">normal (default)</option>
                <option value="lcs">lcs</option>
                <option value="unorder-normal">unorder-normal</option>
                <option value="unorder-lcs">unorder-lcs</option>
                <option value="compare-key">compare-key</option>
              </select>
            </label>
            {arrayDiffMethod === 'compare-key' && (
              <label htmlFor="compare-key">
                <Label
                  title="Compare key"
                  tip="The key to use for matching objects in arrays. Objects with the same value for this key will be matched and compared, regardless of their position in the array."
                />
                <input
                  type="text"
                  id="compare-key"
                  value={compareKey}
                  onChange={e => setCompareKey(e.target.value)}
                  placeholder="e.g., oid, userId, id"
                />
              </label>
            )}
            <label htmlFor="ignore-case">
              <Label
                title="Ignore case"
                tip="Whether to ignore case when comparing string values."
              />
              <input
                type="checkbox"
                id="ignore-case"
                checked={ignoreCase}
                onChange={e => setIgnoreCase(e.target.checked)}
              />
            </label>
            <label htmlFor="ignore-case-for-key">
              <Label
                title="Ignore case for key"
                tip="Whether to ignore case when comparing object keys."
              />
              <input
                type="checkbox"
                id="ignore-case-for-key"
                checked={ignoreCaseForKey}
                onChange={e => setIgnoreCaseForKey(e.target.checked)}
              />
            </label>
            <label htmlFor="recursive-equal">
              <Label
                title="Recursive equal"
                tip="Whether to use recursive equal to compare objects. This can provide a better output when there are unchanged object items in an array, but it may cause performance issues when the data is very large."
              />
              <input
                type="checkbox"
                id="recursive-equal"
                checked={recursiveEqual}
                onChange={e => setRecursiveEqual(e.target.checked)}
              />
            </label>
            <label htmlFor="preserve-key-order">
              <Label
                title="Preserve key order"
                tip={
                  <>
                    Sometimes you do not want the keys in result be sorted, for example <code>start_time</code> and <code>end_time</code> will be swapped by default. You can set this option to let the differ preserve the key order according to <code>before</code> or <code>after</code>.
                  </>
                }
              />
              <select
                id="preserve-key-order"
                value={preserveKeyOrder}
                onChange={e => setPreserveKeyOrder((e.target.value === 'sort' ? undefined : e.target.value) as DifferOptions['preserveKeyOrder'])}
              >
                <option value="sort">sort (default)</option>
                <option value="before">by "before"</option>
                <option value="after">by "after"</option>
              </select>
            </label>
          </form>
        </div>
        <div className="config">
          <form>
            <legend>VIEWER CONFIGURATION</legend>
            <label htmlFor="indent">
              <Label
                title="Indent"
                tip={<>Controls the indent in the <code>&lt;Viewer&gt;</code> component.</>}
              />
              <input
                type="number"
                id="indent"
                min={1}
                max={16}
                value={indent}
                onChange={e => setIndent(Number(e.target.value))}
              />
            </label>
            <label htmlFor="highlight-inline-diff">
              <Label
                title="Highlight inline diff"
                tip={
                  <>
                    Whether to show the inline diff highlight. For example, if the left value <code>"JSON diff can't be possible"</code> is changed to the right value <code>"JSON diff is possible"</code>, it will be recognized as we first remove <code>can't be</code> and then add <code>is</code>. This feature is powered by <a href="https://github.com/gliese1337/fast-myers-diff" target="_blank" rel="noreferrer">gliese1337/fast-myers-diff</a>. Note: the <code>showModification</code> must be enabled, or you will not see modified lines.
                  </>
                }
              />
              <input
                type="checkbox"
                id="highlight-inline-diff"
                checked={highlightInlineDiff}
                onChange={e => setHighlightInlineDiff(e.target.checked)}
              />
            </label>
            <label htmlFor="inline-diff-mode">
              <Label
                title="Inline diff mode"
                tip={
                  <>
                    Control the inline diff behaviour. If the inline diff sources are sentences, we can diff them "by word" instead of "by character". For normal sentences, just set the method to <code>word</code> and the separator to <code>" "</code> (a half-width space) works like a charm. But if you prefer the Git-style output, you can leave this props default, which is diffing "by character".
                  </>
                }
              />
              <select
                id="inline-diff-mode"
                disabled={!highlightInlineDiff}
                value={inlineDiffMode}
                onChange={e => setInlineDiffMode(e.target.value as InlineDiffOptions['mode'])}
              >
                <option value="char">char (default)</option>
                <option value="word">word</option>
              </select>
            </label>
            <label htmlFor="inline-diff-separator">
              <Label
                title="Word separator"
                tip="The separator to split the inline diff sources, default is a half-width space."
              />
              <input
                id="inline-diff-separator"
                disabled={!highlightInlineDiff}
                value={inlineDiffSeparator}
                onChange={e => setInlineDiffSeparator(e.target.value)}
                placeholder="Works when mode = char"
              />
            </label>
            <label htmlFor="syntax-highlight">
              <Label
                title="Syntax highlight"
                tip="Support syntax highlight. The viewer component will render like prismjs, and you can write your own style. Please don't forget to import the corresponding CSS file, e.g. import 'json-diff-kit/viewer-monokai.less';"
              />
              <input
                type="checkbox"
                id="syntax-highlight"
                checked={syntaxHighlight}
                onChange={e => setSyntaxHighlight(e.target.checked)}
              />
            </label>
            <label htmlFor="hide-unchanged-lines">
              <Label
                title="Hide unchanged lines"
                tip="Whether to hide the unchanged lines (like what GitHub and GitLab does)."
              />
              <input
                type="checkbox"
                id="hide-unchanged-lines"
                checked={hideUnchangedLines}
                onChange={e => setHideUnchangedLines(e.target.checked)}
              />
            </label>
            <label htmlFor="use-virtual-scroll">
              <Label
                title="Use virtual scroll (experimental)"
                tip="Whether to use virtual scroll. This can improve the rendering performance when the data is very large, but it's not well-tested."
              />
              <input
                type="checkbox"
                id="use-virtual-scroll"
                checked={virtual}
                onChange={e => setVirtual(e.target.checked)}
              />
            </label>
          </form>
        </div>
        <div className="config">
          <form>
            <legend>GENERATEDE CODE</legend>
            <GeneratedCode code={code} />
          </form>
        </div>
        <div className="statistics">
          <img src="https://img.shields.io/npm/v/json-diff-kit.svg?style=flat" style={{ marginRight: 8 }} />
          <iframe
            src="https://ghbtns.com/github-btn.html?user=rexskz&repo=json-diff-kit&type=star&count=true"
            frameBorder="0"
            scrolling="0"
            width="90"
            height="20"
            title="GitHub"
          />
        </div>
      </div>
      <div className={`layout-right${fullscreen ? ' layout-right-fullscreen' : ''}`}>
        <div className="title">
          INPUTS
          <span className="control-button" onClick={clearAll}>[CLEAR ALL]</span>
          <span className="control-button" onClick={beautify}>[BEAUTIFY]</span>
        </div>
        <div className="inputs">
          <textarea
            ref={beforeInputRef}
            placeholder="before"
            defaultValue={beforeRef.current}
            onChange={e => setBefore(e.target.value, true)}
          />
          <textarea
            ref={afterInputRef}
            placeholder="after"
            defaultValue={afterRef.current}
            onChange={e => setAfter(e.target.value, true)}
          />
        </div>
        <div className="title">
          DIFF RESULTS
          <span className="control-button" onClick={() => setFullscreen(pre => !pre)}>[{fullscreen ? 'EXIT ' : ''}PAGE FULLSCREEN]</span>
          {!!error && <span className="error">{error}</span>}
        </div>
        <div className="results">
          <Viewer diff={diff} {...viewerOptions} />
        </div>
      </div>
    </div>
  );
};

Playground.displayName = 'Playground';

export default Playground;
