import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root_2 = $.from_html(`<p> </p>`);
var root = $.from_html(`<p> </p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);
	let visible = $.prop($$props, 'visible', 12);
	let intros = $.prop($$props, 'intros', 28, () => []);
	let outros = $.prop($$props, 'outros', 28, () => []);
	let intro_count = $.prop($$props, 'intro_count', 12, 0);
	let outro_count = $.prop($$props, 'outro_count', 12, 0);
	let status = $.mutable_source('waiting...');

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	function introstart(e) {
		intros().push(e.target.textContent);
		intro_count(intro_count() + 1);
		$.set(status, 'introstart');
	}

	function introend(e) {
		intro_count(intro_count() - 1);
		$.set(status, 'introend');
	}

	function outrostart(e) {
		outros().push(e.target.textContent);
		outro_count(outro_count() + 1);
		$.set(status, 'outrostart');
	}

	function outroend(e) {
		outro_count(outro_count() - 1);
		$.set(status, 'outroend');
	}

	var $$exports = {
		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		},

		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		},

		get intros() {
			return intros();
		},

		set intros($$value) {
			intros($$value);
			$.flush();
		},

		get outros() {
			return outros();
		},

		set outros($$value) {
			outros($$value);
			$.flush();
		},

		get intro_count() {
			return intro_count();
		},

		set intro_count($$value) {
			intro_count($$value);
			$.flush();
		},

		get outro_count() {
			return outro_count();
		},

		set outro_count($$value) {
			outro_count($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var node_1 = $.sibling(p, 2);

	$.each(node_1, 1, things, $.index, ($$anchor, thing) => {
		var fragment_1 = $.comment();
		var node_2 = $.first_child(fragment_1);

		{
			var consequent = ($$anchor) => {
				var p_1 = root_2();
				var text_1 = $.child(p_1, true);

				$.reset(p_1);
				$.template_effect(() => $.set_text(text_1, $.get(thing)));
				$.transition(1, p_1, () => foo);
				$.transition(2, p_1, () => foo);
				$.event('introstart', p_1, introstart);
				$.event('introend', p_1, introend);
				$.event('outrostart', p_1, outrostart);
				$.event('outroend', p_1, outroend);
				$.append($$anchor, p_1);
			};

			$.if(node_2, ($$render) => {
				if (visible()) $$render(consequent);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.template_effect(() => $.set_text(text, $.get(status)));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}