import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input/>`);
var root_2 = $.from_html(`<input/>`);
var root_3 = $.from_html(`<input/>`);
var root_4 = $.from_html(`<input/>`);
var root_5 = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let active = $.prop($$props, 'active', 12, 'default');
	let autofocusFalse = $.prop($$props, 'autofocusFalse', 12, false);
	let autofocusTrue = $.prop($$props, 'autofocusTrue', 12, true);
	let spread = { autofocus: true };

	var $$exports = {
		get active() {
			return active();
		},

		set active($$value) {
			active($$value);
			$.flush();
		},

		get autofocusFalse() {
			return autofocusFalse();
		},

		set autofocusFalse($$value) {
			autofocusFalse($$value);
			$.flush();
		},

		get autofocusTrue() {
			return autofocusTrue();
		},

		set autofocusTrue($$value) {
			autofocusTrue($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var input = root_1();

			$.autofocus(input, true);
			$.template_effect(() => $.set_attribute(input, 'title', active()));
			$.append($$anchor, input);
		};

		var consequent_1 = ($$anchor) => {
			var input_1 = root_2();

			$.autofocus(input_1, autofocusFalse());
			$.template_effect(() => $.set_attribute(input_1, 'title', active()));
			$.append($$anchor, input_1);
		};

		var consequent_2 = ($$anchor) => {
			var input_2 = root_3();

			$.autofocus(input_2, autofocusTrue());
			$.template_effect(() => $.set_attribute(input_2, 'title', active()));
			$.append($$anchor, input_2);
		};

		var consequent_3 = ($$anchor) => {
			var input_3 = root_4();

			$.attribute_effect(input_3, () => ({ title: active(), ...spread }), void 0, void 0, void 0, void 0, true);
			$.append($$anchor, input_3);
		};

		var consequent_4 = ($$anchor) => {
			var input_4 = root_5();

			$.attribute_effect(input_4, () => ({ title: active(), ...spread, autofocus: false }), void 0, void 0, void 0, void 0, true);
			$.append($$anchor, input_4);
		};

		$.if(node, ($$render) => {
			if (active() === 'default') $$render(consequent); else if (active() === 'dynamic-false') $$render(consequent_1, 1); else if (active() === 'dynamic-true') $$render(consequent_2, 2); else if (active() === 'spread') $$render(consequent_3, 3); else if (active() === 'spread-override') $$render(consequent_4, 4);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}