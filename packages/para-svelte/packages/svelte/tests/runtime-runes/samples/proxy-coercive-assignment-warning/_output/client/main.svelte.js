import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Test from './Test.svelte';

const funBind = $.wrap_snippet(Main, function ($$anchor, context = $.noop) {
	$.validate_snippet_args(...arguments);

	var input = root_1();

	$.bind_this(input, (e) => context().element = e, () => {});
	$.append($$anchor, input);
});

var root_1 = $.add_locations($.from_html(`<input/>`), Main[$.FILENAME], [[31, 1]]);
var root = $.add_locations($.from_html(`<button> </button> <div>x</div> <input type="checkbox"/> <input type="checkbox"/> <!> <!> <!> <!> <button>change opacity (fixed)</button> <button>change opacity (unknown)</button>`, 1), Main[$.FILENAME], [[17, 0], [22, 0], [23, 0], [24, 0], [35, 0], [36, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const binding_group = [];
	let opacity = $.prop($$props, 'opacity', 3, 0.5);
	let entries = $.tag_proxy($.proxy([]), 'entries');
	let object = $.tag_proxy($.proxy({ items: null, group: [] }), 'object');
	let elementFunBind = $.tag($.state(void 0), 'elementFunBind');

	// should omit $.assign via static analysis
	const fixed = (node) => node.style.opacity = 0.5;

	// should use $.assign, but it should not warn
	const unknown = (node) => $.assign(node.style, 'opacity', '=', opacity(), 'main.svelte:14:27');

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var div = $.sibling(button, 2);

	$.bind_this(div, ($$value) => entries[0] = $$value, () => entries?.[0]);

	var input_1 = $.sibling(div, 2);

	$.remove_input_defaults(input_1);
	$.validate_binding('bind:group={object.group}', [], () => object, () => 'group', 23, 31);
	input_1.value = input_1.__value = '1';

	var input_2 = $.sibling(input_1, 2);

	$.remove_input_defaults(input_2);
	$.validate_binding('bind:group={object.group}', [], () => object, () => 'group', 24, 31);
	input_2.value = input_2.__value = '2';

	var node_1 = $.sibling(input_2, 2);

	$.validate_binding('bind:this={entries[1]}', [], () => entries, () => 1, 26, 6);
	$.add_svelte_meta(() => $.bind_this(Test(node_1, {}), ($$value) => entries[1] = $$value, () => entries?.[1]), 'component', Main, 26, 0, { componentTag: 'Test' });

	var node_2 = $.sibling(node_1, 2);

	$.add_svelte_meta(() => $.bind_this(Test(node_2, {}), (v) => entries[2] = v, () => entries[2]), 'component', Main, 27, 0, { componentTag: 'Test' });

	var node_3 = $.sibling(node_2, 2);

	$.validate_binding('bind:x={entries[3]}', [], () => entries, () => 3, 28, 6);

	$.add_svelte_meta(
		() => Test(node_3, {
			get x() {
				return entries[3];
			},

			set x($$value) {
				entries[3] = $$value;
			}
		}),
		'component',
		Main,
		28,
		0,
		{ componentTag: 'Test' }
	);

	var node_4 = $.sibling(node_3, 2);

	$.add_svelte_meta(
		() => funBind(node_4, () => ({
			set element(e) {
				$.set(elementFunBind, e, true);
			}
		})),
		'render',
		Main,
		33,
		0
	);

	var button_1 = $.sibling(node_4, 2);
	var button_2 = $.sibling(button_1, 2);

	$.template_effect(($0) => $.set_text(text, `items: ${$0 ?? ''}`), [() => JSON.stringify(object.items)]);

	$.delegated('click', button, function click() {
		return $.assign(object, 'items', '??=', () => [], 'main.svelte:17:24').push(object.items.length);
	});

	$.bind_group(
		binding_group,
		[],
		input_1,
		function get() {
			return object.group;
		},
		function set($$value) {
			object.group = $$value;
		}
	);

	$.bind_group(
		binding_group,
		[],
		input_2,
		function get() {
			return object.group;
		},
		function set($$value) {
			object.group = $$value;
		}
	);

	$.delegated('click', button_1, function click_1(e) {
		return fixed(e.currentTarget);
	});

	$.delegated('click', button_2, function click_2(e) {
		return unknown(e.currentTarget);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);