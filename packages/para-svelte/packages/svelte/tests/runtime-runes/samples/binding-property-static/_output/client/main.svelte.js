import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.add_locations($.from_html(`<div></div>`), Main[$.FILENAME], [[55, 1]]);
var root = $.add_locations($.from_html(`<input/> <input/> <!> <!> <!> <input/> <input/> <input/> <!> <!> <!> <div></div>`, 1), Main[$.FILENAME], [[50, 0], [51, 0], [59, 0], [60, 0], [61, 0], [65, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let pojo = { value: 1 };
	let raw = { value: 2 };
	let reactive = $.tag_proxy($.proxy({ value: 3 }), 'reactive');
	let value = $.tag($.state(4), 'value');

	let accessors = {
		get value() {
			return $.get(value);
		},

		set value(v) {
			$.set(value, v, true);
		}
	};

	let proxied = $.tag($.state(5), 'proxied');

	let proxy = new Proxy({}, {
		get(target, prop, receiver) {
			if ($.strict_equals(prop, 'value')) {
				return $.get(proxied);
			}

			return Reflect.get(target, prop, receiver);
		},

		set(target, prop, value, receiver) {
			if ($.strict_equals(prop, 'value')) {
				$.set(proxied, value, true);

				return true;
			}

			return Reflect.set(target, prop, value, receiver);
		}
	});

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);
	$.validate_binding('bind:value={pojo.value}', [], () => pojo, () => 'value', 50, 7);

	var input_1 = $.sibling(input, 2);

	$.remove_input_defaults(input_1);
	$.validate_binding('bind:value={raw.value}', [], () => raw, () => 'value', 51, 7);

	var node = $.sibling(input_1, 2);

	$.validate_binding('bind:value={pojo.value}', [], () => pojo, () => 'value', 52, 7);

	$.add_svelte_meta(
		() => Child(node, {
			get value() {
				return pojo.value;
			},

			set value($$value) {
				pojo.value = $$value;
			}
		}),
		'component',
		Main,
		52,
		0,
		{ componentTag: 'Child' }
	);

	var node_1 = $.sibling(node, 2);

	$.validate_binding('bind:value={raw.value}', [], () => raw, () => 'value', 53, 7);

	$.add_svelte_meta(
		() => Child(node_1, {
			get value() {
				return raw.value;
			},

			set value($$value) {
				raw.value = $$value;
			}
		}),
		'component',
		Main,
		53,
		0,
		{ componentTag: 'Child' }
	);

	var node_2 = $.sibling(node_1, 2);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.validate_binding('bind:this={pojo.value}', [], () => pojo, () => 'value', 55, 6);
			$.bind_this(div, ($$value) => pojo.value = $$value, () => pojo?.value);
			$.append($$anchor, div);
		};

		$.add_svelte_meta(
			() => $.if(node_2, ($$render) => {
				if ($.get(value)) $$render(consequent);
			}),
			'if',
			Main,
			54,
			0
		);
	}

	var input_2 = $.sibling(node_2, 2);

	$.remove_input_defaults(input_2);
	$.validate_binding('bind:value={reactive.value}', [], () => reactive, () => 'value', 59, 7);

	var input_3 = $.sibling(input_2, 2);

	$.remove_input_defaults(input_3);
	$.validate_binding('bind:value={accessors.value}', [], () => accessors, () => 'value', 60, 7);

	var input_4 = $.sibling(input_3, 2);

	$.remove_input_defaults(input_4);
	$.validate_binding('bind:value={proxy.value}', [], () => proxy, () => 'value', 61, 7);

	var node_3 = $.sibling(input_4, 2);

	$.validate_binding('bind:value={reactive.value}', [], () => reactive, () => 'value', 62, 7);

	$.add_svelte_meta(
		() => Child(node_3, {
			get value() {
				return reactive.value;
			},

			set value($$value) {
				reactive.value = $$value;
			}
		}),
		'component',
		Main,
		62,
		0,
		{ componentTag: 'Child' }
	);

	var node_4 = $.sibling(node_3, 2);

	$.validate_binding('bind:value={accessors.value}', [], () => accessors, () => 'value', 63, 7);

	$.add_svelte_meta(
		() => Child(node_4, {
			get value() {
				return accessors.value;
			},

			set value($$value) {
				accessors.value = $$value;
			}
		}),
		'component',
		Main,
		63,
		0,
		{ componentTag: 'Child' }
	);

	var node_5 = $.sibling(node_4, 2);

	$.validate_binding('bind:value={proxy.value}', [], () => proxy, () => 'value', 64, 7);

	$.add_svelte_meta(
		() => Child(node_5, {
			get value() {
				return proxy.value;
			},

			set value($$value) {
				proxy.value = $$value;
			}
		}),
		'component',
		Main,
		64,
		0,
		{ componentTag: 'Child' }
	);

	var div_1 = $.sibling(node_5, 2);

	$.bind_this(div_1, ($$value) => pojo.value = $$value, () => pojo?.value);

	$.bind_value(
		input,
		function get() {
			return pojo.value;
		},
		function set($$value) {
			pojo.value = $$value;
		}
	);

	$.bind_value(
		input_1,
		function get() {
			return raw.value;
		},
		function set($$value) {
			raw.value = $$value;
		}
	);

	$.bind_value(
		input_2,
		function get() {
			return reactive.value;
		},
		function set($$value) {
			reactive.value = $$value;
		}
	);

	$.bind_value(
		input_3,
		function get() {
			return accessors.value;
		},
		function set($$value) {
			accessors.value = $$value;
		}
	);

	$.bind_value(
		input_4,
		function get() {
			return proxy.value;
		},
		function set($$value) {
			proxy.value = $$value;
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}