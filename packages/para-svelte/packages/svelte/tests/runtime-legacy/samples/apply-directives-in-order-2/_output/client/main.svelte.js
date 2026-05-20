import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root = $.from_html(`<input/> <input/> <input/> <input/> <input/> <input/>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 28, () => []);

	function one(elem) {
		elem.addEventListener('input', () => {
			value().push('1');
		});
	}

	function four(elem) {
		elem.addEventListener('input', () => {
			value().push('4');
		});
	}

	function eight(elem) {
		elem.addEventListener('input', () => {
			value().push('8');
		});
	}

	function twelve(elem) {
		elem.addEventListener('input', () => {
			value().push('12');
		});
	}

	function fifteen(elem) {
		elem.addEventListener('input', () => {
			value().push('15');
		});
	}

	function seventeen(elem) {
		elem.addEventListener('input', () => {
			value().push('17');
		});
	}

	const foo = $.mutable_source({
		set two(v) {
			value().push('2');
		},

		set six(v) {
			value().push('6');
		},

		set nine(v) {
			value().push('9');
		},

		set eleven(v) {
			value().push('11');
		},

		set thirteen(v) {
			value().push('13');
		},

		set sixteen(v) {
			value().push('16');
		}
	});

	function three() {
		value().push('3');
	}

	function five() {
		value().push('5');
	}

	function seven() {
		value().push('7');
	}

	function ten() {
		value().push('10');
	}

	function fourteen() {
		value().push('14');
	}

	function eighteen() {
		value().push('18');
	}

	let el = $.mutable_source();

	onMount(() => {
		// ensure that bind:this doesn't influence the order of directives
		// and isn't affected itself by an action being on the element
		value().push('bind:this ' + !!$.get(el));
	});

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);
	$.action(input, ($$node) => one?.($$node));
	$.effect(() => $.bind_value(input, () => $.get(foo).two, ($$value) => $.mutate(foo, $.get(foo).two = $$value)));
	$.effect(() => $.event('input', input, three));

	var input_1 = $.sibling(input, 2);

	$.remove_input_defaults(input_1);
	$.action(input_1, ($$node) => four?.($$node));
	$.effect(() => $.event('input', input_1, five));
	$.effect(() => $.bind_value(input_1, () => $.get(foo).six, ($$value) => $.mutate(foo, $.get(foo).six = $$value)));

	var input_2 = $.sibling(input_1, 2);

	$.remove_input_defaults(input_2);
	$.effect(() => $.event('input', input_2, seven));
	$.action(input_2, ($$node) => eight?.($$node));
	$.effect(() => $.bind_value(input_2, () => $.get(foo).nine, ($$value) => $.mutate(foo, $.get(foo).nine = $$value)));

	var input_3 = $.sibling(input_2, 2);

	$.remove_input_defaults(input_3);
	$.effect(() => $.event('input', input_3, ten));
	$.effect(() => $.bind_value(input_3, () => $.get(foo).eleven, ($$value) => $.mutate(foo, $.get(foo).eleven = $$value)));
	$.action(input_3, ($$node) => twelve?.($$node));

	var input_4 = $.sibling(input_3, 2);

	$.remove_input_defaults(input_4);
	$.effect(() => $.bind_value(input_4, () => $.get(foo).thirteen, ($$value) => $.mutate(foo, $.get(foo).thirteen = $$value)));
	$.effect(() => $.event('input', input_4, fourteen));
	$.action(input_4, ($$node) => fifteen?.($$node));

	var input_5 = $.sibling(input_4, 2);

	$.remove_input_defaults(input_5);
	$.bind_this(input_5, ($$value) => $.set(el, $$value), () => $.get(el));
	$.effect(() => $.bind_value(input_5, () => $.get(foo).sixteen, ($$value) => $.mutate(foo, $.get(foo).sixteen = $$value)));
	$.action(input_5, ($$node) => seventeen?.($$node));
	$.effect(() => $.event('input', input_5, eighteen));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}